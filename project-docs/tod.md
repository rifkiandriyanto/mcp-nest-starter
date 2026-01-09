Tentu, saya mengerti sepenuhnya. Anda ingin mengubah total fungsi endpoint yang sebelumnya `GET /enrolled/me`.

**Tujuan Baru:**
Bukan lagi hanya menampilkan kursus yang sudah diikuti, melainkan **menampilkan SEMUA daftar kursus** yang ada di platform, dan untuk setiap kursus, diberi penanda status khusus untuk pengguna yang sedang login:
1.  `isEnrolled`: `true` jika pengguna sudah mendaftar di kursus itu, `false` jika belum.
2.  `isActive`: `true` jika itu adalah kursus yang sedang aktif dipelajari, `false` jika tidak.

Ini adalah perubahan yang signifikan dan sangat tepat untuk fitur "Jelajahi Kursus" bagi pengguna yang sudah login.

Karena tujuannya berubah, saya sangat merekomendasikan untuk mengubah nama endpoint dari `enrolled/me` menjadi `me` agar lebih semantik dan jelas. Endpoint `GET /api/v1/courses/me` akan berarti "berikan saya semua kursus dari sudut pandang saya".

Berikut adalah langkah-langkah lengkap untuk mengimplementasikan perubahan ini.

### Langkah 1: Perbarui `CourseResponseDto`

Pertama, kita perlu menambahkan `isEnrolled` dan memastikan `enrollmentId` dan `isActive` bisa bernilai `null` atau `false` jika pengguna belum terdaftar.

#### File: `src/courses/dto/course-response.dto.ts` (Diperbarui)

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CourseResponseDto {
  @ApiProperty({
    type: String,
    description: 'The unique identifier for the course.',
  })
  id: string;

  @ApiProperty({ type: String, example: 'English for Beginners' })
  title: string;

  @ApiProperty({
    type: String,
    example: 'A course for beginners in the English language.',
  })
  description: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'The URL of the course icon.',
    example: 'https://avatars.githubusercontent.com/u/62269306',
  })
  icon: string | null;

  @ApiProperty({
    type: String,
    description: 'The name of the course category.',
    example: 'Languages',
  })
  category: string;

  // +++ ADDED isEnrolled PROPERTY +++
  @ApiProperty({
    type: Boolean,
    description: 'Indicates if the user is enrolled in this course.',
    example: false,
  })
  isEnrolled: boolean;

  // +++ UPDATED: Now optional and can be null +++
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'The ID of the enrollment record, if enrolled.',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  enrollmentId: string | null;

  // +++ UPDATED: Default example is now false +++
  @ApiProperty({
    type: Boolean,
    description:
      'Indicates if this course is the current active learning path for the user.',
    example: false,
  })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
```

**Perubahan:**
1.  Menambahkan properti baru `isEnrolled: boolean`.
2.  Mengubah `enrollmentId` menjadi opsional dan bisa `null` (`string | null`).
3.  Menggunakan `@ApiPropertyOptional` untuk `icon` dan `enrollmentId` agar dokumentasi Swagger lebih akurat.

---

### Langkah 2: Implementasi Logika Baru di `CoursesController`

Ini adalah bagian inti. Kita akan mengganti implementasi `findMyEnrolledCourses` dengan logika baru yang lebih canggih dan mengubah nama endpointnya.

#### File: `src/courses/courses.controller.ts` (Diperbarui secara signifikan)

```typescript
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Post,
  Body,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllCoursesDto } from './dto/find-all-courses.dto';
import { CreateCourseDto } from './dto/create-course-dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Course } from './domain/course';
import { CourseResponseDto } from './dto/course-response.dto';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { Enrollment } from '../enrollments/domain/enrollment';

@ApiTags('Courses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'courses',
  version: '1',
})
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  // +++ START: REWRITTEN ENDPOINT FOR "GET ALL COURSES FOR ME" +++
  /**
   * Retrieves all courses, enriched with the current user's enrollment status.
   */
  @Get('me') // Renamed from 'enrolled/me' for semantic clarity
  @ApiOkResponse({
    type: InfinityPaginationResponse(CourseResponseDto),
    description:
      'Returns a paginated list of all courses, with user-specific enrollment status.',
  })
  async findMyCourses(
    @Request() request,
    @Query() query: FindAllCoursesDto,
  ): Promise<InfinityPaginationResponseDto<CourseResponseDto>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    const profileId = request.user.id;

    // 1. Fetch all user's enrollments in one go
    const enrollments =
      await this.enrollmentsService.findAllByProfileId(profileId);

    // 2. Create a lookup map for efficient access (O(1) lookup)
    const enrollmentsMap = new Map(
      enrollments.map((e) => [e.course.id, e]),
    );

    // 3. Fetch the paginated list of ALL courses
    const coursesPage = await this.coursesService.findAllWithPagination({
      paginationOptions: { page, limit },
    });

    // 4. Map each course to the response DTO, enriching it with enrollment data
    const responseData = coursesPage.map((course) => {
      const enrollment = enrollmentsMap.get(course.id);
      const dto = new CourseResponseDto();

      dto.id = course.id;
      dto.title = course.title;
      dto.description = course.description;
      dto.category = course.category.name;
      dto.icon = course.icon?.url ?? null;
      dto.createdAt = course.createdAt;
      dto.updatedAt = course.updatedAt;

      // Enrich with user-specific data
      dto.isEnrolled = !!enrollment;
      dto.isActive = enrollment?.isActive ?? false;
      dto.enrollmentId = enrollment?.id ?? null;

      return dto;
    });

    return infinityPagination(responseData, { page, limit });
  }
  // +++ END: REWRITTEN ENDPOINT +++

  // The old 'findMyEnrolledCourses' and its mapper are now removed.

  @Post()
  @ApiCreatedResponse({ type: Course })
  create(@Body() createCourseDto: CreateCourseDto): Promise<Course> {
    return this.coursesService.create(createCourseDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(CourseResponseDto),
  })
  async findAll(
    @Query() query: FindAllCoursesDto,
  ): Promise<InfinityPaginationResponseDto<CourseResponseDto>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    const courses = await this.coursesService.findAllWithPagination({
      paginationOptions: { page, limit },
    });

    // Note: This public endpoint does not contain user-specific data.
    return infinityPagination(
      courses.map((course) => this.mapCourseToPublicDto(course)),
      { page, limit },
    );
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: String, required: true })
  @ApiOkResponse({ type: CourseResponseDto })
  async findById(@Param('id') id: string): Promise<CourseResponseDto | null> {
    const course = await this.coursesService.findById(id);
    return course ? this.mapCourseToPublicDto(course) : null;
  }

  // Renamed for clarity: this mapper is for public-facing data
  private mapCourseToPublicDto(course: Course): CourseResponseDto {
    const responseDto = new CourseResponseDto();
    responseDto.id = course.id;
    responseDto.title = course.title;
    responseDto.description = course.description;
    responseDto.category = course.category.name;
    responseDto.createdAt = course.createdAt;
    responseDto.updatedAt = course.updatedAt;
    responseDto.icon = course.icon ? course.icon.url : null;
    // User-specific fields are false/null by default
    responseDto.isEnrolled = false;
    responseDto.isActive = false;
    responseDto.enrollmentId = null;
    return responseDto;
  }

  @Patch(':id')
  @ApiParam({ name: 'id', type: String, required: true })
  @ApiOkResponse({ type: Course })
  update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ): Promise<Course> {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: String, required: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.coursesService.delete(id);
  }
}
```

### Ringkasan Perubahan Utama

1.  **Endpoint Diubah**: `GET /courses/enrolled/me` diubah menjadi `GET /courses/me` agar lebih akurat secara semantik.
2.  **Logika Baru**:
    *   Mengambil **semua** data pendaftaran (`enrollments`) milik pengguna terlebih dahulu.
    *   Membuat `Map` dari `enrollments` untuk pencarian yang sangat cepat (kunci: `course.id`, nilai: `enrollment object`).
    *   Mengambil daftar **semua kursus** yang ada dengan paginasi.
    *   Menggabungkan kedua data tersebut: Untuk setiap kursus, ia memeriksa `Map` untuk melihat apakah ada data pendaftaran. Berdasarkan itu, ia mengisi `isEnrolled`, `isActive`, dan `enrollmentId`.
3.  **Efisiensi**: Pendekatan ini sangat efisien karena hanya ada dua panggilan ke database (satu untuk semua enrollment, satu untuk halaman kursus), bukan satu panggilan per kursus.
4.  **DTO Diperbarui**: `CourseResponseDto` disesuaikan untuk mendukung status baru ini.
5.  **Endpoint Lama Dihapus**: Logika `findMyEnrolledCourses` yang lama dan mapper-nya (`mapEnrollmentToCourseResponseDto`) telah digantikan sepenuhnya.

Sekarang, frontend Anda dapat memanggil `GET /api/v1/courses/me` untuk mendapatkan semua data yang dibutuhkan dalam satu permintaan API untuk membangun halaman "Jelajahi Kursus" yang dinamis.


-----

Gaada datanya harusnya profileId 33 akan muncul

id
uuid
progress
integer
isCompleted
boolean
isChestOpened
boolean
createdAt
timestamp without time zone
updatedAt
timestamp without time zone
profileId
integer
unitNodeId
uuid


8466be0e-2a72-47a7-b7cb-71ddfc25d65a				2025-10-30 04:07:16.454257	2025-10-30 04:07:16.454257	1	f70493c4-cef1-40e5-9ef0-88eab418ea6c
4535ba76-25fc-4b09-b86d-f50a6d724884				2025-10-30 04:07:16.454257	2025-10-30 04:07:16.454257	1	b678cd54-7adf-49ba-86ec-f9d372a78fa9
58b2a274-aff8-453e-9989-69010227faba				2025-10-30 04:07:16.454257	2025-10-30 04:07:16.454257	1	107b51d1-fe26-4d02-94df-09e1c2eb53fd
88a2a0fc-4fa3-4c71-b64e-09af5f420844				2025-10-30 04:07:16.454257	2025-10-30 04:07:16.454257	1	16735be5-ee29-458a-adb8-b8efabc1ef05
28494713-d7d2-478b-827c-d7b0254caaea				2025-10-30 04:07:16.454257	2025-10-30 04:07:16.454257	1	4faf603c-a04e-4981-b032-58df68db001f
af0d253e-48e6-4374-bde0-b0e671b6b65d				2025-10-30 04:07:16.454257	2025-10-30 04:07:16.454257	1	8561245f-e425-4b80-baa8-f7949d42c592
ce816544-ff5f-4de5-9fcb-b3a107e6332f				2025-10-30 04:07:16.454257	2025-10-30 04:07:16.454257	1	3749ddc2-6ae4-4c6f-8ce0-0f51d581d2ed
b72e79fa-e031-47f1-8101-114aab481ca3				2025-10-30 04:07:16.454257	2025-10-30 04:07:16.454257	1	2d4bf28f-bf56-4d68-a5b1-f498e82af980
c67aa42a-4cd5-4bad-9c20-f42693d2ba9f				2025-10-30 04:07:16.454257	2025-10-30 04:07:16.454257	1	b707095a-4a22-48f2-89f7-2e46cc496dbf
5a115829-391c-40b3-9d44-95af4c47dad6				2025-10-30 04:07:16.454257	2025-10-30 04:07:16.454257	1	295f5ddc-53b3-4f35-806c-db5bf44c955c
151ca589-fbe9-4685-b7ab-c5a5b07ffda9				2025-10-30 04:07:16.454257	2025-10-30 04:07:16.454257	1	149ea061-0b4d-47f2-bcf2-b96404c9c7fd
67382950-d95e-416e-b97c-15e33a2d0e66				2025-10-30 04:07:16.454257	2025-10-30 04:07:16.454257	1	0056cf33-27c7-46ed-9fc4-1e6f80ab6d7e
a84501c7-8ade-4a82-9da2-594840cff001				2025-10-30 04:07:16.454257	2025-10-30 04:07:16.454257	1	c338abe9-048d-4501-bdc2-bd13ec115e8a
0469469c-729e-4f50-89d8-f00ab662ebc7				2025-10-30 04:07:16.454257	2025-10-30 04:07:16.454257	1	1ec86559-9ea2-4a22-ad06-7000ebf62546