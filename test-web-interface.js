#!/usr/bin/env node

// Automated test for web interface AI endpoints
const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function makeRequest(path, method = 'POST', body = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data.trim() ? JSON.parse(data) : {}
          });
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (method !== 'GET' && Object.keys(body).length > 0) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Running Web Interface API Tests');
  console.log('─'.repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  try {
    // Test 1: AI Status Analysis
    console.log('1️⃣  Testing AI Status Analysis endpoint...');
    const statusResponse = await makeRequest('/api/ai/status');
    
    if (statusResponse.status === 200 && 
        statusResponse.data.success && 
        statusResponse.data.analysis.analysis) {
      console.log('✅ AI Status Analysis: PASSED');
      console.log(`   Analysis: ${statusResponse.data.analysis.analysis.substring(0, 60)}...`);
      passed++;
    } else {
      console.log('❌ AI Status Analysis: FAILED');
      console.log(`   Status: ${statusResponse.status}`);
      failed++;
    }
    
    // Test 2: AI Coordination
    console.log('\n2️⃣  Testing AI Task Coordination endpoint...');
    const coordinateResponse = await makeRequest('/api/ai/coordinate');
    
    if (coordinateResponse.status === 200 && 
        coordinateResponse.data.success && 
        coordinateResponse.data.analysis.task_relationships) {
      console.log('✅ AI Task Coordination: PASSED');
      console.log(`   Relationships found: ${coordinateResponse.data.analysis.task_relationships.length}`);
      console.log(`   Suggestions: ${coordinateResponse.data.analysis.coordination_suggestions.length}`);
      passed++;
    } else {
      console.log('❌ AI Task Coordination: FAILED');
      console.log(`   Status: ${coordinateResponse.status}`);
      failed++;
    }
    
    // Test 3: Progress Recording (save command)
    console.log('\n3️⃣  Testing Progress Recording endpoint...');
    const saveResponse = await makeRequest('/api/ai/save', 'POST', {
      description: 'Automated test of progress recording functionality'
    });
    
    if (saveResponse.status === 200 && 
        saveResponse.data.success && 
        saveResponse.data.analysis.analysis) {
      console.log('✅ Progress Recording: PASSED');
      console.log(`   Analysis: ${saveResponse.data.analysis.analysis.substring(0, 60)}...`);
      console.log(`   File Updates: ${saveResponse.data.fileUpdateApplied ? 'Applied' : 'Cancelled'}`);
      passed++;
    } else {
      console.log('❌ Progress Recording: FAILED');
      console.log(`   Status: ${saveResponse.status}`);
      failed++;
    }
    
    // Test 4: Project Management - List projects
    console.log('\n4️⃣  Testing project list endpoint...');
    const projectsResponse = await makeRequest('/api/projects/list', 'GET');
    
    if (projectsResponse.status === 200 && projectsResponse.data.success !== undefined) {
      console.log('✅ Project List API: PASSED');
      console.log(`   Projects found: ${projectsResponse.data.projects ? projectsResponse.data.projects.length : 0}`);
      passed++;
    } else {
      console.log('❌ Project List API: FAILED');
      console.log(`   Status: ${projectsResponse.status}`);
      failed++;
    }
    
    // Test 5: Project Management - Create project
    console.log('\n5️⃣  Testing project creation endpoint...');
    const testProjectName = `test-project-${Date.now()}`;
    const createProjectResponse = await makeRequest('/api/projects/create', 'POST', {
      name: testProjectName,
      goal: 'Test project for automated testing',
      level: 2
    });
    
    if (createProjectResponse.status === 200 && createProjectResponse.data.success) {
      console.log('✅ Project Creation: PASSED');
      console.log(`   Created: ${createProjectResponse.data.project.displayName}`);
      passed++;
    } else {
      console.log('❌ Project Creation: FAILED');
      console.log(`   Status: ${createProjectResponse.status}`);
      console.log(`   Error: ${createProjectResponse.data.error || 'Unknown error'}`);
      failed++;
    }
    
    // Test 6: AI Reflection endpoint
    console.log('\n6️⃣  Testing AI Reflection endpoint...');
    const reflectionResponse = await makeRequest('/api/ai/reflect', 'POST', {});
    
    if (reflectionResponse.status === 200 && 
        reflectionResponse.data.success && 
        reflectionResponse.data.reflection.reflection_insights) {
      console.log('✅ AI Reflection: PASSED');
      console.log(`   Insights found: ${reflectionResponse.data.reflection.reflection_insights.length}`);
      console.log(`   Goal alignment: ${reflectionResponse.data.reflection.goal_alignment.alignment_score}%`);
      passed++;
    } else {
      console.log('❌ AI Reflection: FAILED');
      console.log(`   Status: ${reflectionResponse.status}`);
      failed++;
    }
    
    // Test 7: Zoom Navigation endpoint
    console.log('\n7️⃣  Testing Zoom Navigation endpoint...');
    const zoomResponse = await makeRequest('/api/zoom', 'POST', {
      direction: 'in'
    });
    
    if (zoomResponse.status === 200 && 
        zoomResponse.data.success && 
        zoomResponse.data.zoom.context_shift) {
      console.log('✅ Zoom Navigation: PASSED');
      console.log(`   Context: ${zoomResponse.data.zoom.context_shift}`);
      console.log(`   New Level: ${zoomResponse.data.zoom.new_level}`);
      passed++;
    } else {
      console.log('❌ Zoom Navigation: FAILED');
      console.log(`   Status: ${zoomResponse.status}`);
      failed++;
    }
    
    // Test 8: Workspace Initialization endpoint
    console.log('\n8️⃣  Testing Workspace Initialization endpoint...');
    const testWorkspacePath = `/data/data/com.termux/files/home/test-workspace-${Date.now()}`;
    const workspaceResponse = await makeRequest('/api/workspace/init', 'POST', {
      directory: testWorkspacePath
    });
    
    if (workspaceResponse.status === 200 && 
        workspaceResponse.data.success && 
        workspaceResponse.data.result.status === 'success') {
      console.log('✅ Workspace Initialization: PASSED');
      console.log(`   Directory: ${workspaceResponse.data.result.directory}`);
      console.log(`   Files created: ${workspaceResponse.data.result.created_files.length}`);
      passed++;
    } else {
      console.log('❌ Workspace Initialization: FAILED');
      console.log(`   Status: ${workspaceResponse.status}`);
      console.log(`   Error: ${workspaceResponse.data.error || 'Unknown error'}`);
      failed++;
    }
    
  } catch (error) {
    console.log('❌ Test suite failed with error:', error.message);
    failed++;
  }
  
  // Results
  console.log('\n📊 Test Results:');
  console.log('─'.repeat(30));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Web interface APIs are working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the API endpoints.');
    process.exit(1);
  }
}

runTests();