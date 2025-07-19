# Deployment Guide - Productivity System Web Dashboard

## ✅ Pre-deployment Checklist

### 1. Dependencies & Build Process
- ✅ **Node.js**: Requires ≥16.0.0 (main) and ≥18.0.0 (web dashboard)
- ✅ **Main dependencies**: Installed and up-to-date
- ✅ **Web dashboard dependencies**: Installed and up-to-date
- ✅ **TypeScript build**: `npm run build` compiles to `dist/` directory
- ✅ **No build errors**: TypeScript compilation successful

### 2. Web Dashboard Structure
```
web-dashboard/
├── package.json          # Web dashboard dependencies
├── server/
│   └── index.js          # Express server with Socket.IO
├── public/
│   ├── index.html        # Main web interface
│   ├── css/style.css     # Glassmorphism styling
│   └── js/dashboard.js   # Client-side JavaScript
└── scripts/
    └── server-control.js # Process management
```

### 3. Startup Commands
```bash
# Method 1: From main project (recommended)
npm run web

# Method 2: Direct server startup
node web-dashboard/server/index.js

# Method 3: Using web dashboard package scripts
cd web-dashboard && npm run start
```

## 🚀 Deployment Steps

### Local Development
1. **Build the TypeScript CLI**:
   ```bash
   npm run build
   ```

2. **Start web dashboard**:
   ```bash
   npm run web
   ```

3. **Access dashboard**: http://localhost:3000

### Production Deployment

#### Environment Variables
```bash
# Optional: AI functionality
ANTHROPIC_API_KEY=your_api_key_here

# Optional: Custom port
PORT=3000
```

#### Docker Deployment (if needed)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "web"]
```

#### Process Management
```bash
# Using PM2 (recommended for production)
pm2 start web-dashboard/server/index.js --name "productivity-dashboard"

# Using built-in scripts
cd web-dashboard
npm run server:start    # Start with process management
npm run server:stop     # Stop server
npm run server:restart  # Restart server
npm run server:status   # Check status
```

## 🧪 Deployment Verification

### Automated Test Suite
```bash
# Run API endpoint tests
node test-web-interface.js

# Expected output:
# ✅ AI Status Analysis: PASSED
# ✅ AI Task Coordination: PASSED  
# ✅ Progress Recording: PASSED
# ✅ Project List API: PASSED
# ✅ Project Creation: PASSED
# 📈 Success Rate: 100%
```

### Manual Verification Checklist
- [ ] Dashboard loads at http://localhost:3000
- [ ] All four modes (Do/Plan/Reflect/Projects) switch correctly
- [ ] AI Status Analysis button works and shows results
- [ ] Task Coordination displays relationship analysis
- [ ] Progress Recording saves and shows AI feedback
- [ ] Project Management modal opens and creates projects
- [ ] Real-time updates work (WebSocket connection)
- [ ] Mobile responsive design works
- [ ] No console errors in browser

## 📝 API Endpoints

### Core Endpoints
- `GET /api/workspace` - Workspace overview
- `GET /api/projects` - Project list (legacy)
- `GET /api/focus-flow` - Level 0 tasks for Do mode
- `GET /api/plan-view` - Hierarchical tasks for Plan mode
- `GET /api/reflect-data` - Progress metrics for Reflect mode
- `POST /api/tasks/complete` - Mark tasks as complete

### AI-Powered Endpoints
- `POST /api/ai/status` - AI status analysis
- `POST /api/ai/coordinate` - Task relationship analysis
- `POST /api/ai/save` - Progress recording with AI feedback

### Project Management
- `GET /api/projects/list` - List all projects with metadata
- `POST /api/projects/create` - Create new project

## 🔧 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Find process using port 3000
netstat -tlnp | grep :3000
# Kill process if needed
pkill -f "node.*server.*index.js"
```

**Dependencies Missing**
```bash
# Reinstall all dependencies
npm install
cd web-dashboard && npm install
```

**WebSocket Connection Issues**
- Check firewall settings allow port 3000
- Verify no proxy blocking WebSocket connections
- Check browser console for connection errors

**File System Watching Issues**
- Ensure workspace directory exists and is readable
- Check file permissions on workspace files
- Verify chokidar can watch the workspace path

## 📊 Performance Notes

### Resource Usage
- **Memory**: ~50-100MB for web server
- **CPU**: Low usage, spikes during AI API calls
- **Disk I/O**: Minimal, mainly file watching
- **Network**: WebSocket connections + AI API calls

### Scaling Considerations
- Single-user application (not multi-tenant)
- File-based storage (no database required)
- AI calls are rate-limited by API provider
- WebSocket connections scale to ~1000 concurrent users

## 🔐 Security Notes

### Current Security Status
- ✅ **Local-first**: All data stored locally
- ✅ **No authentication**: Single-user application
- ✅ **File access**: Limited to workspace directory
- ✅ **AI integration**: API key stored in environment
- ⚠️ **Network exposure**: Binds to all interfaces (0.0.0.0)

### Production Recommendations
- Use reverse proxy (nginx) for HTTPS
- Implement authentication if network-exposed
- Rate limit AI API endpoints
- Regular security updates for dependencies

---

**Last Updated**: 2025-07-19  
**Version**: 1.0.0  
**Test Status**: ✅ All tests passing (5/5)