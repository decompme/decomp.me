# Cromper

Cromper is an async compilation and assembly service for decomp.me. It provides a Tornado-based HTTP API for compiling code and assembling binary objects, designed to offload compilation work from the main Django backend.

## Features

- **Async compilation**: Non-blocking compilation using Tornado's async capabilities
- **Multiple compilers**: Support for GCC, IDO, MWCC, Clang, and other compilers
- **Multiple platforms**: Support for N64, PS1, PS2, GameCube, Wii, GBA, and more
- **Sandboxed execution**: Optional sandboxed compilation using nsjail
- **HTTP API**: RESTful endpoints for compilation and assembly operations
- **Fallback support**: Django backend can fall back to local compilation if cromper is unavailable

## API Endpoints

### Health Check
```
GET /health
```
Returns service status.

### Platforms
```
GET /platforms
```
Returns available platforms and their configurations.

### Compilers
```
GET /compilers
```
Returns available compilers and their platform associations.

### Compile
```
POST /compile
{
  "compiler_id": "gcc2.7.2",
  "compiler_flags": "-O2 -g",
  "code": "int main() { return 0; }",
  "context": "#include <stdio.h>",
  "function": "main"
}
```
Compiles source code and returns the resulting object file.

### Assemble
```
POST /assemble
{
  "platform_id": "n64",
  "asm_data": ".text\nmain:\n    nop\n",
  "asm_hash": "hash_value"
}
```
Assembles assembly code and returns the resulting object file.

## Configuration

Cromper uses environment variables for configuration:

- `CROMPER_PORT`: Server port (default: 8888)
- `CROMPER_DEBUG`: Enable debug mode (default: false)
- `USE_SANDBOX_JAIL`: Enable sandboxed execution (default: false)
- `COMPILER_BASE_PATH`: Path to compiler binaries
- `LIBRARY_BASE_PATH`: Path to library files
- `COMPILATION_TIMEOUT_SECONDS`: Compilation timeout (default: 10)
- `ASSEMBLY_TIMEOUT_SECONDS`: Assembly timeout (default: 3)

## Running Cromper

### Development
```bash
cd cromper
python -m cromper.main
```

### With Environment File
```bash
cd cromper
./start.sh
```

### Testing
```bash
cd cromper
python test_integration.py
```

## Integration with Django Backend

The Django backend can be configured to use cromper by setting:

```
USE_CROMPER=true
CROMPER_URL=http://localhost:8888
```

When enabled, the Django backend will attempt to use cromper for compilation and assembly operations, falling back to local execution if cromper is unavailable.

## Architecture

Cromper extracts the core compilation logic from the Django backend into a shared `cromper` package that contains:

- `platforms.py`: Platform definitions and assembly commands
- `compilers.py`: Compiler definitions and configurations
- `flags.py`: Compiler flags and language definitions
- `compiler_wrapper.py`: Core compilation and assembly logic
- `sandbox.py`: Sandboxed execution environment
- `error.py`: Exception definitions

This allows both the Django backend and cromper service to share the same compilation logic without duplication.
