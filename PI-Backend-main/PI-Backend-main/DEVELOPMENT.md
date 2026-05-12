# Development Guide

## Getting Started with Development

### Local Development Setup

1. **Clone and navigate to the project**:
   ```bash
   git clone <repository-url>
   cd PI-Backend
   ```

2. **Create local environment file**:
   ```bash
   cp .env.example .env
   # Edit .env with your local database credentials
   ```

3. **Build the project**:
   ```bash
   ./mvnw clean install -DskipTests
   ```

4. **Run in development mode**:
   ```bash
   ./mvnw spring-boot:run
   ```

## Development Workflow

### Creating a Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### Running Tests
```bash
# Run all tests
./mvnw test

# Run specific test class
./mvnw test -Dtest=YourTestClass

# Run with coverage
./mvnw test jacoco:report
```

### Code Standards

- Follow Google Java Style Guide conventions
- Use meaningful variable and method names
- Add JavaDoc comments for public methods and classes
- Keep methods focused and under 20 lines when possible
- Use proper exception handling

### Making Changes

1. Make your changes
2. Test thoroughly: `./mvnw test`
3. Format code if needed
4. Commit with clear messages: `git commit -m "feat: description"`
5. Push to your branch: `git push origin feature/your-feature-name`
6. Create a Pull Request

## Database Migrations

- Ensure database changes are reflected in entity classes
- Use JPA/Hibernate annotations for schema management
- Document database schema changes in commit messages

## Helpful Commands

```bash
# Clean build
./mvnw clean

# Build without tests
./mvnw clean package -DskipTests

# Check for dependency updates
./mvnw versions:display-dependency-updates

# Install dependencies
./mvnw clean install

# View dependency tree
./mvnw dependency:tree
```

## Debugging

### Enable Debug Logging
Add to `application.properties`:
```properties
logging.level.root=INFO
logging.level.t.esprit=DEBUG
```

### IDE Debugging
- Most IDEs support debugging Spring Boot applications
- Set breakpoints and run: `./mvnw spring-boot:run -Drun.arguments="--debug"`

## Building for Production

```bash
./mvnw clean package -DskipTests -Pprod
java -jar target/jobmatch-0.0.1-SNAPSHOT.jar
```

## Common Development Issues

| Issue | Solution |
|-------|----------|
| MySQL connection refused | Ensure MySQL is running and credentials are correct |
| Port 8080 in use | Change `server.port` in `application.properties` |
| Build failures | Run `./mvnw clean install` to clear cache |
| Entity mapping errors | Check `@Entity` and `@Table` annotations match database schema |

## Additional Resources

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Spring Data JPA Guide](https://spring.io/projects/spring-data-jpa)
- [Spring Security Reference](https://spring.io/projects/spring-security)
- [Maven Documentation](https://maven.apache.org/guides/)

## Need Help?

- Check existing issues: `GitHub Issues`
- Review the documentation in the repo
- Ask team members for guidance
