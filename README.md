# eVelo

**A portfolio strategy simulator for modeling the "Buy, Borrow, Die" tax optimization strategy**

eVelo helps you understand the risks and rewards of leveraged wealth preservation through Monte Carlo simulation. Build multi-asset portfolios, model SBLOC (Securities-Based Line of Credit) borrowing, and visualize probability-based outcomes to make informed financial decisions.

[![GitHub Pages](https://img.shields.io/badge/demo-live-brightgreen)](https://your-username.github.io/eVelo/)

## Features

### Powerful Simulation Engine
- **Monte Carlo Analysis**: Run 1,000 to 100,000 iterations to model portfolio outcomes
- **Multi-Asset Support**: Build portfolios with 2-5 assets and custom weight distributions
- **Bootstrap Resampling**: Use historical return data for realistic market behavior
- **Regime Switching**: Model bull, bear, and crash market periods
- **Correlation Modeling**: Simulate assets with realistic correlation patterns
- **SBLOC Integration**: Model borrowing, interest accrual, and margin call risks
- **Inflation Adjustment**: View results in real or nominal terms

### Financial Calculations
- Time-Weighted Rate of Return (TWRR)
- Compound Annual Growth Rate (CAGR)
- Annualized volatility and correlation analysis
- Tax savings comparison (BBD vs traditional withdrawal)
- Salary-equivalent calculations for tax-free income
- Margin call probability and timing analysis
- Percentile-based outcome analysis (P10, P25, P50, P75, P90)

### Rich Visualizations
- **Probability Cone**: Net worth projections with percentile confidence bands
- **Distribution Analysis**: Terminal wealth histogram
- **Risk Assessment**: Margin call probability by year
- **Portfolio Composition**: Interactive donut charts
- **Strategy Comparison**: BBD vs traditional sell strategy
- **Correlation Matrix**: Asset relationship heatmap

### Data Management
- Bundled historical data presets (S&P 500, major indices, 30+ years)
- Multiple API integrations (FMP, EODHD, Alpha Vantage, Tiingo, Yahoo Finance)
- Manual data entry option
- Offline-capable with IndexedDB storage
- Portfolio save/load/export/import
- CORS proxy configuration for API access

### Modern User Experience
- Light and dark theme support
- Mobile-responsive design
- Collapsible sidebar controls
- Real-time simulation progress tracking
- Actionable recommendations based on results
- Print-friendly report view
- Fully offline-capable PWA
- Single-file HTML export (portable version)

## Quick Start

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/eVelo.git
cd eVelo

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

1. **Configure Portfolio**: Select assets and set allocation weights
2. **Set Strategy Parameters**: Configure SBLOC terms, withdrawal rates, and time horizon
3. **Run Simulation**: Execute Monte Carlo analysis with your chosen iteration count
4. **Analyze Results**: Review probability cones, distributions, and risk metrics
5. **Compare Strategies**: Evaluate BBD against traditional sell approaches
6. **Export/Save**: Download results or save portfolio configurations for later

## Build & Deploy

```bash
# Build PWA version
npm run build

# Build portable single-file HTML
npm run build:portable

# Build both versions
npm run build:all

# Preview production build
npm run preview
```

Built files are output to:
- PWA: `dist/`
- Portable: `dist-portable/`

## Testing

```bash
# Run all E2E tests
npm run test:e2e

# Quick smoke test
npm run test:e2e:smoke

# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Project Structure

```
eVelo/
├── src/
│   ├── components/       # Web Components (UI elements)
│   │   └── ui/          # UI component library
│   ├── charts/          # Chart.js visualizations
│   ├── simulation/      # Monte Carlo engine & workers
│   ├── sbloc/          # SBLOC modeling logic
│   ├── calculations/    # Financial calculations
│   ├── data/           # API integrations & storage
│   ├── services/       # App services (theme, state)
│   ├── math/           # Math utilities & distributions
│   └── styles/         # CSS with design tokens
├── public/             # Static assets
├── test/               # E2E tests
└── dist-portable/      # Single-file build output
```

## Technology Stack

- **Framework**: Vite + TypeScript
- **UI**: Web Components (Shadow DOM)
- **Charts**: Chart.js with custom plugins
- **Storage**: Dexie (IndexedDB wrapper)
- **Workers**: Web Workers via Comlink
- **Testing**: Vitest + agent-browser (E2E)
- **Build**: Multiple output formats (PWA + portable)

## API Configuration

eVelo supports multiple market data providers. Configure API keys in settings:

- [Financial Modeling Prep](https://financialmodelingprep.com/developer/docs/)
- [EODHD](https://eodhistoricaldata.com/financial-apis/)
- [Alpha Vantage](https://www.alphavantage.co/documentation/)
- [Tiingo](https://api.tiingo.com/)
- Yahoo Finance (no key required)

All APIs are optional - the app includes bundled historical data presets.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Disclaimer

**This tool is for educational and planning purposes only. It does not constitute financial, tax, or legal advice.**

The "Buy, Borrow, Die" strategy involves significant risks including:
- Margin calls and forced liquidation
- Interest rate changes
- Market volatility
- Changes in tax law

Consult with qualified financial, tax, and legal professionals before implementing any investment or borrowing strategy.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Historical market data from various public sources
- Inspired by modern portfolio theory and tax optimization strategies
- Built with open-source technologies

---

**Made with TypeScript and Monte Carlo simulations** | [Documentation](CLAUDE.md) | [Live Demo](https://your-username.github.io/eVelo/)
