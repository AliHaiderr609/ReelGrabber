# SaveClip - Instagram Downloader

A modern, secure, and scalable Instagram content downloader built with Next.js, TypeScript, and PostgreSQL. Download Instagram videos, photos, reels, stories, and IGTV content with enterprise-grade security and anti-abuse measures.

## 🚀 Features

### Core Functionality
- **Multi-format Support**: Download videos, photos, reels, stories, and IGTV
- **High Quality**: Original quality downloads without compression
- **Fast Processing**: Optimized extraction engine with fallback mechanisms
- **Mobile Responsive**: Works seamlessly on all devices

### Security & Anti-Abuse
- **Rate Limiting**: Per-IP and per-user request limits
- **Bot Detection**: Advanced bot detection with behavior analysis
- **CAPTCHA Protection**: CAPTCHA gating for suspicious activity
- **Proxy Rotation**: Automatic proxy rotation to avoid blocks
- **Retry Logic**: Exponential backoff for failed requests

### User Management
- **Authentication**: JWT-based authentication system
- **User Tiers**: Free, Pro, and Enterprise tiers
- **API Keys**: Secure API access for developers
- **Usage Tracking**: Comprehensive usage analytics

### Monetization
- **Subscription Plans**: Monthly and yearly billing
- **Stripe Integration**: Secure payment processing
- **Usage Limits**: Tier-based download and API limits
- **White-label**: Custom branding for enterprise clients

## 🛠️ Tech Stack

### Frontend
- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations
- **React Hook Form**: Form handling
- **Zod**: Schema validation

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **Prisma**: Database ORM
- **PostgreSQL**: Primary database
- **Redis**: Caching and rate limiting
- **Puppeteer**: Headless browser automation
- **Cheerio**: HTML parsing

### External Services
- **Stripe**: Payment processing
- **SendGrid**: Email delivery
- **Sentry**: Error monitoring
- **Cloudflare**: CDN and security

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/save-clip.git
   cd save-clip
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Database setup**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/saveclip"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### Proxy Configuration

Add your proxy servers to the proxy pool in `src/lib/instagram-extractor.ts`:

```typescript
const proxyPool: ProxyConfig[] = [
  { host: 'proxy1.example.com', port: 8080, username: 'user', password: 'pass' },
  { host: 'proxy2.example.com', port: 8080, username: 'user', password: 'pass' },
];
```

## 📊 Database Schema

### Core Tables
- **users**: User accounts and authentication
- **downloads**: Download requests and metadata
- **subscriptions**: Stripe subscription management
- **rate_limits**: Anti-abuse rate limiting
- **analytics**: Usage and performance metrics

### Relationships
- Users have many downloads and subscriptions
- Downloads belong to users (optional for anonymous)
- Subscriptions belong to users
- Rate limits track per-IP usage

## 🔒 Security Features

### Rate Limiting
- **Free Tier**: 10 downloads/hour
- **Pro Tier**: 100 downloads/hour  
- **Enterprise**: 1000 downloads/hour

### Bot Detection
- User agent analysis
- Request pattern detection
- Behavioral analysis
- CAPTCHA challenges

### Data Protection
- Encrypted sensitive data
- HTTPS enforcement
- CORS protection
- CSP headers

## 💰 Monetization

### Subscription Tiers

#### Free Tier
- 10 downloads per day
- Basic quality
- Ad-supported
- Community support

#### Pro Tier ($9.99/month)
- 100 downloads per day
- High quality
- No ads
- Priority support
- API access

#### Enterprise Tier ($49.99/month)
- Unlimited downloads
- White-label options
- Dedicated support
- Custom integrations
- SLA guarantees

### Revenue Streams
- Monthly/yearly subscriptions
- API usage fees
- White-label licensing
- Affiliate commissions

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Domain DNS configured
- [ ] Monitoring tools set up
- [ ] Backup systems tested

### Scaling Considerations
- Load balancers for horizontal scaling
- Database read replicas
- CDN for static assets
- Microservices architecture
- Auto-scaling policies

## 📈 Monitoring

### Performance Metrics
- Response times
- Error rates
- Throughput
- Resource usage

### Business Metrics
- User growth
- Revenue tracking
- Usage patterns
- Support tickets

### Security Monitoring
- Failed login attempts
- Suspicious activity
- Rate limit violations
- Bot detection alerts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Document new features
- Follow the existing code style

## 📄 Legal

### Terms of Service
- Educational and personal use only
- No commercial redistribution
- Respect Instagram's terms
- User responsibility for content

### Privacy Policy
- Minimal data collection
- No data selling
- User control over data
- GDPR compliance

### Copyright Compliance
- DMCA policy
- Fair use guidelines
- Content ownership
- Takedown procedures

## 🆘 Support

### Documentation
- [API Reference](./docs/api.md)
- [User Guide](./docs/user-guide.md)
- [Developer Guide](./docs/developer.md)
- [FAQ](./docs/faq.md)

### Contact
- Email: support@saveclip.app
- Discord: [Join our community](https://discord.gg/saveclip)
- GitHub Issues: [Report bugs](https://github.com/yourusername/save-clip/issues)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for educational and personal use only. Users are responsible for complying with Instagram's Terms of Service and applicable copyright laws. The developers are not responsible for any misuse of this tool.

---

**Built with ❤️ by the SaveClip Team**
