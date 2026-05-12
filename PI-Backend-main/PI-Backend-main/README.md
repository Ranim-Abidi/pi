# Matchy Khedma Backend

A Spring Boot REST API backend for the JobMatch platform - an AI-powered job matching system connecting candidates with employers.

## Project Overview

- **Framework**: Spring Boot 3.2.5
- **Java Version**: 17
- **Build Tool**: Maven
- **Database**: MySQL
- **Security**: Spring Security with JWT Authentication

## Prerequisites

- Java 17 or higher
- Maven 3.6+ (or use provided `mvnw`)
- MySQL 8.0 or higher
- Git

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd PI-Backend
```

### 2. Database Setup

Create a MySQL database for the project:
```sql
CREATE DATABASE jobmatch_db;
```

Update database credentials in `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/jobmatch_db
spring.datasource.username=root
spring.datasource.password=your_password
```

### 3. Install Dependencies & Build

Using Maven:
```bash
./mvnw clean install
```

Or on Windows:
```bash
mvnw.cmd clean install
```

### 4. Run the Application

```bash
./mvnw spring-boot:run
```

The server will start on `http://localhost:8080`

## Project Structure

```
src/
├── main/
│   ├── java/t/esprit/...     # Application source code
│   └── resources/
│       └── application.properties  # Configuration
└── test/
    └── java/t/esprit/...     # Test files
```

## Configuration

### application.properties
- **Database URL**: `spring.datasource.url`
- **Database Credentials**: Update username and password
- **Server Port**: Default is 8080 (configurable via `server.port`)
- **JPA Settings**: Hibernate is configured with `ddl-auto=update`

## Documentation

- [JWT Authentication Changes](./JWT_CHANGES.md) - Security implementation details
- [Login Verification Guide](./VERIFICATION_LOGIN.md) - Authentication verification
- [Changelog](./CHANGELOG.md) - Version history and updates

## API Endpoints

Base URL: `http://localhost:8080/api`

Refer to the API documentation or explore the controller classes in the source code for available endpoints.

## Build & Deploy

### Create Production Build
```bash
./mvnw clean package -DskipTests
```

Output JAR will be in `target/` directory.

### Run JAR
```bash
java -jar target/jobmatch-0.0.1-SNAPSHOT.jar
```

## Development Notes

- Ensure MySQL service is running before starting the application
- Check `application.properties` for current configuration settings
- Run tests with: `./mvnw test`
- Clean build cache with: `./mvnw clean`

## Common Issues

**Port 8080 already in use**: Change the port in `application.properties`
```properties
server.port=8081  # or another available port
```

**Database connection errors**: Verify:
- MySQL is running
- Database credentials are correct
- Database name matches `jobmatch_db`

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[Add your license information here]

## Contact

For questions or issues, please open an issue in the repository.
