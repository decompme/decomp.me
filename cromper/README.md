# cromper

cromper is an async compilation and assembly service for decomp.me. It provides a Tornado-based HTTP API for compiling code and assembling binary objects, designed to offload compilation work from the main Django backend.

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
