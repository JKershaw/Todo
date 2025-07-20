const request = require('supertest');
const express = require('express');
const path = require('path');

describe('Workspace and Navigation API Endpoints', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Set up workspace initialization endpoint
    app.post('/api/workspace/init', async (req, res) => {
      try {
        const { directory } = req.body;
        
        if (!directory || directory.trim().length === 0) {
          return res.status(400).json({ error: 'Directory path is required' });
        }
        
        // For security, only allow initialization within allowed parent
        const normalizedDir = path.resolve(directory);
        const allowedParent = path.resolve('/data/data/com.termux/files/home');
        
        if (!normalizedDir.startsWith(allowedParent)) {
          return res.status(403).json({ error: 'Directory must be within allowed parent path' });
        }
        
        // Mock workspace initialization
        const mockInitResult = {
          directory: directory,
          created_files: [
            'README.md',
            'plan.md', 
            'projects/',
            '.gitignore'
          ],
          status: 'success',
          message: `Workspace initialized at ${directory}`,
          next_steps: [
            'Create your first project with the project creation interface',
            'Set up AI integration by configuring API keys',
            'Start tracking tasks using the Focus Flow interface'
          ]
        };
        
        res.json({
          success: true,
          result: mockInitResult
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to initialize workspace' });
      }
    });
    
    // Set up zoom navigation endpoint
    app.post('/api/zoom', async (req, res) => {
      try {
        const { direction } = req.body;
        
        if (!direction || !['in', 'out'].includes(direction)) {
          return res.status(400).json({ error: 'Direction must be "in" or "out"' });
        }
        
        // Mock zoom navigation
        const currentLevel = 2;
        const newLevel = direction === 'in' ? Math.max(0, currentLevel - 1) : Math.min(4, currentLevel + 1);
        
        const levelNames = {
          0: "Immediate Actions (Next 15 minutes)",
          1: "Today's Focus (Current day)", 
          2: "Current Projects (Days to weeks)",
          3: "Quarterly Milestones (1-3 months)",
          4: "Life Goals (Years and beyond)"
        };
        
        const mockZoomResult = {
          direction: direction,
          previous_level: currentLevel,
          new_level: newLevel,
          level_name: levelNames[newLevel],
          context_shift: `Zoomed ${direction} from ${levelNames[currentLevel]} to ${levelNames[newLevel]}`,
          recommended_focus: newLevel === 0 ? 
            "Focus on immediate actionable tasks" :
            newLevel === 4 ? 
            "Reflect on long-term vision and life alignment" :
            `Review ${levelNames[newLevel].toLowerCase()}`,
          available_tasks: newLevel <= 2 ? 
            `Use the ${newLevel === 0 ? 'Do' : newLevel === 1 ? 'Plan' : 'Projects'} mode to see relevant tasks` :
            "Use Reflect mode to consider broader goals and milestones"
        };
        
        res.json({
          success: true,
          zoom: mockZoomResult
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to navigate zoom levels' });
      }
    });
  });
  
  describe('POST /api/workspace/init', () => {
    it('should initialize workspace successfully', async () => {
      const initData = {
        directory: '/data/data/com.termux/files/home/test-workspace'
      };
      
      const response = await request(app)
        .post('/api/workspace/init')
        .send(initData)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('result');
      
      const result = response.body.result;
      expect(result).toHaveProperty('directory', initData.directory);
      expect(result).toHaveProperty('created_files');
      expect(result).toHaveProperty('status', 'success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('next_steps');
      
      expect(Array.isArray(result.created_files)).toBe(true);
      expect(result.created_files).toContain('README.md');
      expect(result.created_files).toContain('plan.md');
      expect(result.created_files).toContain('projects/');
      expect(result.created_files).toContain('.gitignore');
      
      expect(Array.isArray(result.next_steps)).toBe(true);
      expect(result.next_steps.length).toBeGreaterThan(0);
    });
    
    it('should require directory path', async () => {
      const testCases = [
        {}, // missing directory
        { directory: '' }, // empty directory
        { directory: '   ' } // whitespace only
      ];
      
      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/workspace/init')
          .send(testCase)
          .expect(400);
        
        expect(response.body).toHaveProperty('error', 'Directory path is required');
      }
    });
    
    it('should enforce security restrictions', async () => {
      const restrictedPaths = [
        '/etc/passwd',
        '/root/workspace',
        '/var/log/workspace',
        '/tmp/../etc/workspace',
        '../../../etc/workspace'
      ];
      
      for (const restrictedPath of restrictedPaths) {
        const response = await request(app)
          .post('/api/workspace/init')
          .send({ directory: restrictedPath })
          .expect(403);
        
        expect(response.body).toHaveProperty('error', 'Directory must be within allowed parent path');
      }
    });
    
    it('should allow valid paths within allowed parent', async () => {
      const validPaths = [
        '/data/data/com.termux/files/home/my-workspace',
        '/data/data/com.termux/files/home/projects/new-workspace',
        '/data/data/com.termux/files/home/workspace-2024'
      ];
      
      for (const validPath of validPaths) {
        const response = await request(app)
          .post('/api/workspace/init')
          .send({ directory: validPath })
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.result.directory).toBe(validPath);
      }
    });
  });
  
  describe('POST /api/zoom', () => {
    it('should zoom in successfully', async () => {
      const response = await request(app)
        .post('/api/zoom')
        .send({ direction: 'in' })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('zoom');
      
      const zoom = response.body.zoom;
      expect(zoom).toHaveProperty('direction', 'in');
      expect(zoom).toHaveProperty('previous_level');
      expect(zoom).toHaveProperty('new_level');
      expect(zoom).toHaveProperty('level_name');
      expect(zoom).toHaveProperty('context_shift');
      expect(zoom).toHaveProperty('recommended_focus');
      expect(zoom).toHaveProperty('available_tasks');
      
      expect(zoom.new_level).toBeLessThan(zoom.previous_level);
    });
    
    it('should zoom out successfully', async () => {
      const response = await request(app)
        .post('/api/zoom')
        .send({ direction: 'out' })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      
      const zoom = response.body.zoom;
      expect(zoom).toHaveProperty('direction', 'out');
      expect(zoom.new_level).toBeGreaterThan(zoom.previous_level);
    });
    
    it('should validate direction parameter', async () => {
      const invalidDirections = [
        '', // empty
        'up', // invalid
        'down', // invalid
        'left', // invalid
        'zoom', // invalid
        123, // not string
        null, // null
        undefined // undefined
      ];
      
      for (const direction of invalidDirections) {
        const response = await request(app)
          .post('/api/zoom')
          .send({ direction })
          .expect(400);
        
        expect(response.body).toHaveProperty('error', 'Direction must be "in" or "out"');
      }
    });
    
    it('should require direction parameter', async () => {
      const response = await request(app)
        .post('/api/zoom')
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Direction must be "in" or "out"');
    });
    
    it('should respect zoom level boundaries', async () => {
      // Test that zoom levels stay within 0-4 range
      const inResponse = await request(app)
        .post('/api/zoom')
        .send({ direction: 'in' })
        .expect(200);
      
      const outResponse = await request(app)
        .post('/api/zoom')
        .send({ direction: 'out' })
        .expect(200);
      
      expect(inResponse.body.zoom.new_level).toBeGreaterThanOrEqual(0);
      expect(inResponse.body.zoom.new_level).toBeLessThanOrEqual(4);
      
      expect(outResponse.body.zoom.new_level).toBeGreaterThanOrEqual(0);
      expect(outResponse.body.zoom.new_level).toBeLessThanOrEqual(4);
    });
    
    it('should provide appropriate level names', async () => {
      const response = await request(app)
        .post('/api/zoom')
        .send({ direction: 'in' })
        .expect(200);
      
      const levelName = response.body.zoom.level_name;
      const validLevelNames = [
        "Immediate Actions (Next 15 minutes)",
        "Today's Focus (Current day)", 
        "Current Projects (Days to weeks)",
        "Quarterly Milestones (1-3 months)",
        "Life Goals (Years and beyond)"
      ];
      
      expect(validLevelNames).toContain(levelName);
    });
  });
});