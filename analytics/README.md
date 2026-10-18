# Lolys' Accessories & Home: Analytics & Forecasting

This package provides sales forecasting, inventory restocking intelligence, and customer analytics for the shop.

Production forecasting remains on hold. Read the [model card](../docs/analytics/model-card.md),
[operating guide](../docs/runbooks/analytics.md), and [execution findings](../docs/analytics/execution-review.md)
before using forecasts. Passing unit tests alone does not verify the database-to-screen path.

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
