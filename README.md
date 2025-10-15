# OpenAI Apps SDK Examples

A collection of example applications demonstrating OpenAI Apps SDK functionality.

## Overview

This repository contains various example applications built with the OpenAI Apps SDK, showcasing different features and use cases.

## Examples Included

- **Pizzaz**: Interactive map application with location markers
- **Pizzaz Albums**: Photo gallery with film strip navigation
- **Pizzaz Carousel**: Place cards carousel component
- **Pizzaz List**: List view component
- **Solar System**: Interactive solar system visualization
- **Todo**: Simple todo application

## Getting Started

### Prerequisites

- Node.js (for JavaScript/TypeScript examples)
- Python (for Python server examples)
- pnpm (recommended package manager)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/kuntu-tech/openai-apps-sdk-examples.git
cd openai-apps-sdk-examples
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm dev
```

## Project Structure

```
├── src/                    # Source code for examples
│   ├── pizzaz/            # Map application
│   ├── pizzaz-albums/     # Photo gallery
│   ├── pizzaz-carousel/   # Carousel component
│   ├── pizzaz-list/       # List component
│   ├── solar-system/      # Solar system visualization
│   └── todo/              # Todo application
├── pizzaz_server_node/    # Node.js server
├── pizzaz_server_python/  # Python server
└── solar-system_server_python/ # Python server for solar system
```

## Development

### Running Examples

Each example can be run individually or all together:

```bash
# Run all examples
pnpm dev

# Run specific server
cd pizzaz_server_node
npm run dev

cd pizzaz_server_python
python main.py
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for the Apps SDK
- Contributors and maintainers
