# Integration Tests

This directory contains integration tests for decomp.me that require both the Django backend and cromper services to be running.

## What goes here?

Tests that:
- Create scratches with real compilers
- Compile code and verify compilation results
- Test assembly/diff generation
- Test scoring functionality
- Test export functionality that requires compilation

## What stays in Django tests?

Tests that:
- Test pure Django functionality (authentication, database operations)
- Test API routing and permissions without compilation
- Test model relationships and validations
- Test middleware and request handling

## Running Integration Tests

These tests require:
1. Cromper service running (port 8888)
2. Django backend running (port 8000)
3. Database connection

### Quick Start (Recommended)

If you already have services running:
```bash
cd integration_tests
./run_tests_manual.sh
```

Or directly:
```bash
cd integration_tests
uv run pytest
```

### Setup

Install dependencies with uv:
```bash
cd integration_tests
uv sync
```

### Manual Setup (Recommended for Development)

1. Start cromper:
```bash
cd cromper
poetry run python -m cromper.main
```

2. Start Django:
```bash
cd backend
poetry run python manage.py runserver
```

3. Run tests:
```bash
cd integration_tests
./run_tests_manual.sh
# or
uv run pytest
```

### Using Docker Compose (Experimental)

**Note**: Currently has permission issues with cromper container. See [DEBUGGING.md](DEBUGGING.md) for details.

```bash
cd integration_tests
./run_tests.sh
```
