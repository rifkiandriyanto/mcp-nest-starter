# Database

## Table of Contents <!-- omit in toc -->

- [About The Database](#about-the-database)
- [Working with the Database Schema (TypeORM)](#working-with-the-database-schema-typeorm)
  - [Generate Migration](#generate-migration)
  - [Run Migration](#run-migration)
  - [Revert Migration](#revert-migration)
  - [Drop All Tables in Database](#drop-all-tables-in-database)
- [Seeding (TypeORM)](#seeding-typeorm)
  - [Creating Seeds](#creating-seeds)
  - [Run Seed](#run-seed)
  - [Factory and Faker](#factory-and-faker)
- [Performance Optimization (PostgreSQL + TypeORM)](#performance-optimization-postgresql--typeorm)
  - [Indexes and Foreign Keys](#indexes-and-foreign-keys)
  - [Max Connections](#max-connections)
- [Switching to MySQL](#switching-to-mysql)

---

## About The Database

This boilerplate uses **PostgreSQL** with **TypeORM** as its database and object-relational mapper. The project structure follows [Hexagonal Architecture](architecture.md#hexagonal-architecture) to ensure a clean separation between business logic and database implementation.

## Working with the Database Schema (TypeORM)

### Generate Migration

1.  Create or update an entity file with the extension `.entity.ts`. For example, `post.entity.ts`:

    ```ts
    // /src/posts/infrastructure/persistence/relational/entities/post.entity.ts

    import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
    import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

    @Entity()
    export class Post extends EntityRelationalHelper {
      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      title: string;

      @Column()
      body: string;

      // Add any other fields you need here
    }
    ```

2.  Next, generate the migration file by running:

    ```bash
    npm run migration:generate -- src/database/migrations/CreatePostTable
    ```

3.  Apply this migration to the database using the [run migration](#run-migration) command.

### Run Migration

This command applies all pending migrations to the database.

```bash
npm run migration:run
```

### Revert Migration

This command reverts the last applied migration.

```bash
npm run migration:revert
```

### Drop All Tables in Database

This command will drop all tables in the database. **Use with caution, as this is a destructive operation.**

```bash
npm run schema:drop
```

---

## Seeding (TypeORM)

### Creating Seeds

1.  Create a new seed file using the CLI. For an entity named `Post`, you would run:
    ```bash
    npm run seed:create:relational -- --name Post
    ```
2.  Navigate to the newly created file at `src/database/seeds/relational/post/post-seed.service.ts`.
3.  Implement your seeding logic inside the `run` method.
4.  Execute the seed using the [run seed](#run-seed) command.

### Run Seed

This command executes the seed services to populate your database with initial data.

```bash
npm run seed:run:relational
```

> **Important Note:** If you encounter an error while seeding (e.g., a `UNIQUE constraint failed` error), it often happens after running a migration on a database that already contains data. To fix this, you must reset the database:
>
> 1.  First, drop the entire schema:
>     ```bash
>     npm run schema:drop
>     ```
> 2.  Then, run the migrations again to rebuild the database structure:
>      ```bash
>      npm run migration:run
>      ```
> 3.  Finally, run the seed command again:
>     ```bash
>     npm run seed:run:relational
>     ```

### Factory and Faker

You can use factories with `@faker-js/faker` to generate large amounts of realistic test data.

1.  Install Faker:

    ```bash
    npm i --save-dev @faker-js/faker
    ```

2.  Create a factory file, for example `src/database/seeds/relational/user/user.factory.ts`:

    ```ts
    import { faker } from '@faker-js/faker';
    import { RoleEnum } from '../../../../roles/roles.enum';
    import { StatusEnum } from '../../../../statuses/statuses.enum';
    import { Injectable } from '@nestjs/common';
    import { InjectRepository } from '@nestjs/typeorm';
    import { Repository } from 'typeorm';
    import { RoleEntity } from '../../../../roles/infrastructure/persistence/relational/entities/role.entity';
    import { UserEntity } from '../../../../users/infrastructure/persistence/relational/entities/user.entity';
    import { StatusEntity } from '../../../../statuses/infrastructure/persistence/relational/entities/status.entity';

    @Injectable()
    export class UserFactory {
      constructor(
        @InjectRepository(UserEntity)
        private repositoryUser: Repository<UserEntity>,
        @InjectRepository(RoleEntity)
        private repositoryRole: Repository<RoleEntity>,
        @InjectRepository(StatusEntity)
        private repositoryStatus: Repository<StatusEntity>,
      ) {}

      createRandomUser() {
        return () => {
          return this.repositoryUser.create({
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            email: faker.internet.email(),
            password: faker.internet.password(),
            role: this.repositoryRole.create({ id: RoleEnum.user }),
            status: this.repositoryStatus.create({ id: StatusEnum.active }),
          });
        };
      }
    }
    ```

3.  Update the corresponding seed service (`user-seed.service.ts`) to use the factory:

    ```ts
    // ... imports
    import { UserFactory } from './user.factory';
    import { faker } from '@faker-js/faker';

    @Injectable()
    export class UserSeedService {
      constructor(
        // ... other injections
        private userFactory: UserFactory,
      ) {}

      async run() {
        // ... other seeding logic
        await this.repository.save(
          faker.helpers.multiple(this.userFactory.createRandomUser(), {
            count: 5,
          }),
        );
      }
    }
    ```

4.  Ensure the factory is provided in the seed module (`user-seed.module.ts`):

    ```ts
    // ... imports
    import { UserFactory } from './user.factory';

    @Module({
      imports: [TypeOrmModule.forFeature([UserEntity, RoleEntity, StatusEntity])],
      providers: [UserSeedService, UserFactory],
      exports: [UserSeedService],
    })
    export class UserSeedModule {}
    ```

5.  Run the seed command: `npm run seed:run:relational`.

---

## Performance Optimization (PostgreSQL + TypeORM)

### Indexes and Foreign Keys

For optimal query performance, remember to create `indexes` on foreign key columns and other frequently queried columns. By default, PostgreSQL [does not automatically add indexes to foreign keys](https://stackoverflow.com/a/970605/18140714).

### Max Connections

You can configure the maximum number of connections to the database in your `.env` file. This determines how many concurrent database connections your application can handle.

```env
DATABASE_MAX_CONNECTIONS=100
```

Adjust this value based on your application's expected load and your database server's capacity.

## Switching to MySQL

If you wish to switch from `PostgreSQL` to `MySQL`, follow these steps after completing the initial project setup.

1.  **Update your `.env` file:**

    ```env
    DATABASE_TYPE=mysql
    # Use "localhost" for local machine, "mysql" for Docker
    DATABASE_HOST=localhost
    DATABASE_PORT=3306
    DATABASE_USERNAME=root
    DATABASE_PASSWORD=secret
    DATABASE_NAME=app
    ```

2.  **Update your `docker-compose.yml`:**

    ```yml
    services:
      mysql:
        image: mysql:8.0 # Use a specific, stable version
        ports:
          - "${DATABASE_PORT}:3306"
        volumes:
          - mysql-boilerplate-db:/var/lib/mysql
        environment:
          MYSQL_USER: ${DATABASE_USERNAME}
          MYSQL_PASSWORD: ${DATABASE_PASSWORD}
          MYSQL_ROOT_PASSWORD: ${DATABASE_PASSWORD}
          MYSQL_DATABASE: ${DATABASE_NAME}
      # ... other services
    volumes:
      mysql-boilerplate-db:
      # ... other volumes
    ```

3.  **Start the new services:**

    ```bash
    docker compose up -d mysql adminer maildev
    ```

4.  **Install the `mysql2` driver:**

    ```bash
    npm i mysql2
    ```

5.  **Re-generate migrations for MySQL:**
    *   First, delete your existing migration files in `src/database/migrations`.
    *   Then, generate a new one:
        ```bash
        npm run migration:generate -- src/database/migrations/InitialMySQLMigration
        ```

6.  **Run the new migration and seeds:**

    ```bash
    npm run migration:run
    npm run seed:run:relational
    ```

7.  **Run the application:**

    ```bash
    npm run start:dev
    ```

Your application should now be running with MySQL.

---

Previous: [Command Line Interface](cli.md)

Next: [Auth](auth.md)