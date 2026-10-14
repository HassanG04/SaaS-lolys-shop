# Lolys' Accessories & Home: Analytics & Forecasting

This package provides sales forecasting, inventory restocking intelligence, and customer analytics for the shop.

## Structure

```
analytics/
├── config.toml           # Readiness gates, reorder defaults, cleaning parameters
├── pyproject.toml        # Tooling configuration (ruff, pytest)
├── requirements.txt      # Production dependencies
├── requirements-dev.txt  # Test & linter dependencies
├── src/lolys_analytics/  # Source code
│   ├── config.py         # TOML configuration loader
│   ├── synthetic.py      # Deterministic realistic shop data generator
│   └── cli.py            # CLI entrypoint
└── tests/                # Test suites
```

## Running Tests

From repo root:

```bash
npm run analytics:test
```

Or within the `analytics` directory:

```bash
pytest tests/ -v
ruff check src/ tests/
```
