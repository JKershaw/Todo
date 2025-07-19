// Productivity Dashboard JavaScript
class ProductivityDashboard {
  constructor() {
    this.socket = null;
    this.feedbackData = {
      rating: null,
      text: ''
    };
    
    this.init();
  }

  init() {
    this.setupWebSocket();
    this.setupEventListeners();
    this.setupAIControls();
    this.setupProgressRecording();
    this.setupProjectManagement();
    this.setupNavigationControls();
    this.loadInitialData();
  }

  setupWebSocket() {
    this.socket = io();
    
    this.socket.on('connect', () => {
      console.log('✅ Connected to dashboard server');
      this.updateConnectionStatus(true);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from dashboard server');
      this.updateConnectionStatus(false);
    });

    this.socket.on('connected', (data) => {
      console.log('📡 Dashboard connection established:', data.message);
      this.addActivityItem('Connected to productivity dashboard', 'just now');
    });

    this.socket.on('workspace-updated', (data) => {
      console.log('📁 Workspace updated:', data);
      this.addActivityItem(
        `${data.type === 'file-changed' ? 'Modified' : 'Created'}: ${data.file}`,
        this.formatTime(data.timestamp)
      );
      
      // Refresh data after file changes
      setTimeout(() => {
        this.loadFocusFlowData();
        this.loadWorkspaceData();
        this.loadProjectsData();
      }, 500);
    });

    this.socket.on('task-completed', (data) => {
      console.log('✅ Task completed by another client:', data);
      this.addActivityItem(
        `Task completed: ${data.task}`,
        this.formatTime(data.timestamp)
      );
      
      // Refresh focus flow to remove completed task
      this.loadFocusFlowData();
    });

    this.socket.on('error', (error) => {
      console.error('🚨 Socket error:', error);
      this.addActivityItem('Connection error occurred', 'just now');
    });
  }

  setupEventListeners() {
    // Mode switching functionality
    const modeButtons = document.querySelectorAll('.mode-btn');
    const modeContents = document.querySelectorAll('.mode-content');
    
    const switchMode = (targetMode) => {
      // Update button states
      modeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === targetMode);
      });
      
      // Update content visibility
      modeContents.forEach(content => {
        content.classList.toggle('hidden', content.id !== `${targetMode}-content`);
      });
    };
    
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        switchMode(mode);
        
        // Load mode-specific data
        if (mode === 'projects') {
          this.loadProjectsList();
        }
      });
    });

    // Chat functionality
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    const handleSend = () => {
      const text = chatInput.value.trim();
      if (!text) return;
      
      this.addChatMessage(text, true);
      chatInput.value = '';
      
      // Simulate AI response
      setTimeout(() => {
        const responses = [
          "Great! That task looks like a good next step.",
          "I notice this connects to your larger goals. Nice progress!",
          "Perfect timing for that - your energy patterns suggest this is ideal.",
          "This will unlock several other tasks. Good prioritization!"
        ];
        const response = responses[Math.floor(Math.random() * responses.length)];
        this.addChatMessage(response, false);
      }, 800 + Math.random() * 1200);
    };

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSend();
      }
    });

    // Auto-refresh every 30 seconds
    setInterval(() => {
      this.loadFocusFlowData();
      this.loadWorkspaceData();
      this.loadProjectsData();
    }, 30000);
  }

  async loadInitialData() {
    await Promise.all([
      this.loadFocusFlowData(),
      this.loadPlanViewData(),
      this.loadReflectData()
    ]);
  }

  async loadPlanViewData() {
    try {
      const response = await fetch('/api/plan-view');
      const data = await response.json();
      
      const planContent = document.getElementById('plan-content');
      
      if (data.projectHierarchy && Object.keys(data.projectHierarchy).length > 0) {
        let planHtml = '';
        
        // Build hierarchical view - Level 4 (Life Goals) down to Level 0 (Today)
        for (let level = 4; level >= 0; level--) {
          const levelNames = {
            4: 'Life Goals',
            3: 'Quarterly Milestones',
            2: 'Current Projects', 
            1: 'This Week',
            0: 'Today'
          };
          
          let hasTasksAtLevel = false;
          let levelHtml = `<div class="plan-level">
            <h3 class="level-title">${levelNames[level]}</h3>
            <div class="level-tasks">`;
          
          Object.keys(data.projectHierarchy).forEach(projectName => {
            const projectLevels = data.projectHierarchy[projectName];
            if (projectLevels[level] && projectLevels[level].length > 0) {
              hasTasksAtLevel = true;
              levelHtml += `<div class="project-section">
                <div class="project-name">${this.escapeHtml(projectName)}</div>`;
              
              projectLevels[level].forEach((task, taskIndex) => {
                const taskClass = task.completed ? 'completed' : 'pending';
                const checkIcon = task.completed ? '✅' : '◯';
                const clickable = task.completed ? '' : 'clickable';
                levelHtml += `
                  <div class="plan-task ${taskClass} ${clickable}" data-task-data='${JSON.stringify(task)}' data-task-index="${taskIndex}">
                    <span class="task-check">${checkIcon}</span>
                    <span class="task-text">${this.escapeHtml(task.task)}</span>
                  </div>`;
              });
              
              levelHtml += '</div>';
            }
          });
          
          levelHtml += '</div></div>';
          
          if (hasTasksAtLevel) {
            planHtml += levelHtml;
          }
        }
        
        planContent.innerHTML = planHtml || '<div class="empty-state">No plan data found</div>';
        
        // Add click handlers for plan tasks
        const planTasks = planContent.querySelectorAll('.plan-task.clickable');
        planTasks.forEach(taskElement => {
          taskElement.addEventListener('click', () => {
            const taskData = JSON.parse(taskElement.dataset.taskData);
            this.handleTaskClick(taskData, taskElement);
          });
        });
      } else {
        planContent.innerHTML = '<div class="empty-state">No projects found</div>';
      }
      
    } catch (error) {
      console.error('Error loading plan view data:', error);
      const planContent = document.getElementById('plan-content');
      planContent.innerHTML = '<div class="loading">Failed to load plan view</div>';
    }
  }

  async loadReflectData() {
    try {
      const response = await fetch('/api/reflect-data');
      const data = await response.json();
      
      const reflectContent = document.getElementById('reflect-content');
      
      if (data.momentumBars && data.momentumBars.length > 0) {
        let reflectHtml = '<div class="momentum-section">';
        
        // Momentum bars
        reflectHtml += '<h3>Project Momentum</h3>';
        data.momentumBars.forEach(bar => {
          reflectHtml += `
            <div class="momentum-bar-container">
              <div class="momentum-bar-header">
                <span class="momentum-title">${this.escapeHtml(bar.title)}</span>
                <span class="momentum-percentage">${bar.completionRate}%</span>
              </div>
              <div class="momentum-bar">
                <div class="momentum-fill" style="width: ${bar.completionRate}%"></div>
              </div>
              <div class="momentum-description">${this.escapeHtml(bar.description)}</div>
            </div>`;
        });
        
        reflectHtml += '</div>';
        
        // Insights section
        if (data.insights && data.insights.length > 0) {
          reflectHtml += '<div class="insights-section"><h3>Insights</h3>';
          data.insights.forEach(insight => {
            reflectHtml += `
              <div class="insight-card">
                <div class="insight-title">${this.escapeHtml(insight.title)}</div>
                <div class="insight-description">${this.escapeHtml(insight.description)}</div>
              </div>`;
          });
          reflectHtml += '</div>';
        }
        
        reflectContent.innerHTML = reflectHtml;
      } else {
        reflectContent.innerHTML = '<div class="empty-state">No reflection data available</div>';
      }
      
    } catch (error) {
      console.error('Error loading reflect data:', error);
      const reflectContent = document.getElementById('reflect-content');
      reflectContent.innerHTML = '<div class="loading">Failed to load reflection data</div>';
    }
  }

  async loadFocusFlowData() {
    try {
      const response = await fetch('/api/focus-flow');
      const data = await response.json();
      
      const focusFlowContent = document.getElementById('focus-flow-content');
      
      if (data.level0Tasks && data.level0Tasks.length > 0) {
        const tasksHtml = data.level0Tasks.map((task, index) => `
          <div class="focus-task" data-task-index="${index}">
            <div class="focus-task-content">${this.escapeHtml(task.task)}</div>
            <div class="focus-task-project">Connected to: ${this.escapeHtml(task.project)}</div>
          </div>
        `).join('');
        
        focusFlowContent.innerHTML = tasksHtml;
        
        // Add click handlers for task completion
        const focusTasks = focusFlowContent.querySelectorAll('.focus-task');
        focusTasks.forEach(taskElement => {
          taskElement.addEventListener('click', () => {
            const taskIndex = taskElement.dataset.taskIndex;
            const task = data.level0Tasks[taskIndex];
            this.handleTaskClick(task, taskElement);
          });
        });
        
      } else {
        focusFlowContent.innerHTML = `
          <div class="focus-task">
            <div class="focus-task-content">🎉 No immediate tasks! Time to plan or take a break.</div>
            <div class="focus-task-project">Consider using "reflect" command to analyze your progress</div>
          </div>
        `;
      }
      
    } catch (error) {
      console.error('Error loading focus flow data:', error);
      const focusFlowContent = document.getElementById('focus-flow-content');
      focusFlowContent.innerHTML = '<div class="loading">Failed to load focus tasks</div>';
    }
  }

  async handleTaskClick(task, taskElement) {
    // Prevent multiple clicks on same task
    if (taskElement.dataset.completing) return;
    taskElement.dataset.completing = 'true';
    
    try {
      // Visual feedback - show in progress
      taskElement.style.opacity = '0.7';
      taskElement.style.borderColor = '#fbbf24'; // Yellow for in-progress
      
      // Add processing indicator
      const processingIndicator = document.createElement('div');
      processingIndicator.innerHTML = '⏳ Marking as complete...';
      processingIndicator.style.color = '#fbbf24';
      processingIndicator.style.fontSize = '0.875rem';
      processingIndicator.style.marginTop = '0.5rem';
      taskElement.appendChild(processingIndicator);
      
      // Call API to complete task
      const response = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task: task.task,
          project: task.project,
          file: task.file
        })
      });
      
      if (response.ok) {
        // Success - update visual feedback
        processingIndicator.innerHTML = '✅ Completed!';
        processingIndicator.style.color = 'var(--success-color)';
        taskElement.style.borderColor = 'var(--success-color)';
        
        // Log activity
        this.addActivityItem(`Completed: ${task.task}`, 'just now');
        
        // Remove task from view after a brief delay
        setTimeout(() => {
          taskElement.style.transition = 'all 0.3s ease';
          taskElement.style.transform = 'translateX(100%)';
          taskElement.style.opacity = '0';
          
          setTimeout(() => {
            taskElement.remove();
            // Reload focus flow to get updated tasks
            this.loadFocusFlowData();
          }, 300);
        }, 1500);
        
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete task');
      }
      
    } catch (error) {
      console.error('Error completing task:', error);
      
      // Show error state
      const errorIndicator = taskElement.querySelector('div:last-child');
      if (errorIndicator) {
        errorIndicator.innerHTML = '❌ Failed to complete';
        errorIndicator.style.color = '#ef4444';
      }
      
      // Reset visual state
      taskElement.style.opacity = '1';
      taskElement.style.borderColor = '#ef4444';
      
      this.addActivityItem(`Failed to complete: ${task.task}`, 'just now');
      
      // Reset after delay
      setTimeout(() => {
        taskElement.style.opacity = '1';
        taskElement.style.borderColor = 'var(--border-color)';
        if (errorIndicator) errorIndicator.remove();
        delete taskElement.dataset.completing;
      }, 3000);
    }
  }

  async loadWorkspaceData() {
    try {
      const response = await fetch('/api/workspace');
      const data = await response.json();
      
      const workspaceContent = document.getElementById('workspace-content');
      if (data.readme) {
        workspaceContent.innerHTML = `
          <div class="workspace-content">
            <pre>${this.escapeHtml(data.readme)}</pre>
          </div>
        `;
      } else {
        workspaceContent.innerHTML = '<div class="loading">No workspace README found</div>';
      }
    } catch (error) {
      console.error('Error loading workspace data:', error);
      const workspaceContent = document.getElementById('workspace-content');
      workspaceContent.innerHTML = '<div class="loading">Failed to load workspace</div>';
    }
  }

  async loadProjectsData() {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      
      const projectsContent = document.getElementById('projects-content');
      
      if (data.projects && data.projects.length > 0) {
        const projectsHtml = data.projects.map(project => `
          <div class="project-item">
            <div class="project-title">${this.escapeHtml(project.name)}</div>
            <div class="project-status ${project.status.toLowerCase()}">${project.status}</div>
            <div class="project-preview">${this.escapeHtml(project.preview)}</div>
          </div>
        `).join('');
        
        projectsContent.innerHTML = projectsHtml;
      } else {
        projectsContent.innerHTML = '<div class="loading">No active projects found</div>';
      }
    } catch (error) {
      console.error('Error loading projects data:', error);
      const projectsContent = document.getElementById('projects-content');
      projectsContent.innerHTML = '<div class="loading">Failed to load projects</div>';
    }
  }

  updateConnectionStatus(isConnected) {
    const statusElement = document.getElementById('connection-status');
    const dot = statusElement.querySelector('.dot');
    const healthElement = document.getElementById('connection-health');
    
    if (isConnected) {
      dot.classList.remove('offline');
      dot.classList.add('online');
      statusElement.innerHTML = '<span class="dot online"></span> Connected';
      if (healthElement) healthElement.textContent = 'Connected';
    } else {
      dot.classList.remove('online');
      dot.classList.add('offline');
      statusElement.innerHTML = '<span class="dot offline"></span> Disconnected';
      if (healthElement) healthElement.textContent = 'Disconnected';
    }
  }

  addActivityItem(description, time) {
    const activityContent = document.getElementById('activity-content');
    
    // Create new activity item
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.innerHTML = `
      <div class="activity-time">${time}</div>
      <div class="activity-description">${this.escapeHtml(description)}</div>
    `;
    
    // Add to top of activity feed
    activityContent.insertBefore(activityItem, activityContent.firstChild);
    
    // Keep only last 10 items
    const items = activityContent.querySelectorAll('.activity-item');
    if (items.length > 10) {
      items[items.length - 1].remove();
    }
  }

  addChatMessage(text, isUser = false) {
    const chatMessages = document.getElementById('chat-messages');
    
    const message = document.createElement('div');
    message.className = `message ${isUser ? 'user' : 'ai'}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;
    
    message.appendChild(bubble);
    chatMessages.appendChild(message);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async submitFeedback() {
    if (!this.feedbackData.rating) {
      alert('Please select a rating before submitting feedback');
      return;
    }

    const feedbackPayload = {
      rating: this.feedbackData.rating,
      text: this.feedbackData.text,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.log('📝 Submitting feedback:', feedbackPayload);

    // For now, just log and show success
    // In a real implementation, this would POST to an API endpoint
    this.addActivityItem(`Feedback submitted: ${this.feedbackData.rating}`, 'just now');
    
    // Reset feedback form
    document.querySelectorAll('.btn-feedback').forEach(btn => 
      btn.classList.remove('selected'));
    document.getElementById('feedback-text').value = '';
    this.feedbackData = { rating: null, text: '' };
    
    // Show success message
    const submitBtn = document.getElementById('submit-feedback');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '✅ Sent!';
    submitBtn.style.background = 'var(--success-color)';
    
    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.style.background = 'var(--primary-color)';
    }, 2000);
  }

  formatTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return time.toLocaleDateString();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  setupAIControls() {
    const aiStatusBtn = document.getElementById('ai-status-btn');
    const aiCoordinateBtn = document.getElementById('ai-coordinate-btn');
    const aiReflectBtn = document.getElementById('ai-reflect-btn');
    
    if (aiStatusBtn) {
      aiStatusBtn.addEventListener('click', async () => {
        await this.handleAIStatusAnalysis();
      });
    }
    
    if (aiCoordinateBtn) {
      aiCoordinateBtn.addEventListener('click', async () => {
        await this.handleAICoordination();
      });
    }
    
    if (aiReflectBtn) {
      aiReflectBtn.addEventListener('click', async () => {
        await this.handleAIReflection();
      });
    }
  }

  async handleAIStatusAnalysis() {
    const aiStatusBtn = document.getElementById('ai-status-btn');
    const chatMessages = document.getElementById('chat-messages');
    
    // Show loading state
    aiStatusBtn.classList.add('loading');
    aiStatusBtn.textContent = '🔄 Analyzing...';
    
    try {
      console.log('🤖 Requesting AI status analysis');
      
      const response = await fetch('/api/ai/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Display AI analysis in chat
        const analysisMessage = document.createElement('div');
        analysisMessage.className = 'chat-message ai-message';
        analysisMessage.innerHTML = `
          <strong>🧠 AI Status Analysis:</strong>
          <p><strong>Analysis:</strong> ${this.escapeHtml(data.analysis.analysis)}</p>
          <p><strong>Suggestions:</strong></p>
          <ul>
            ${data.analysis.suggestions.map(s => `<li>${this.escapeHtml(s)}</li>`).join('')}
          </ul>
          <p><strong>Reasoning:</strong> ${this.escapeHtml(data.analysis.reasoning)}</p>
          <small style="opacity: 0.7;">AI Service: ${data.aiService.provider} (${data.aiService.model})</small>
        `;
        
        chatMessages.appendChild(analysisMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        this.addActivityItem('AI status analysis completed', 'just now');
        
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
      
    } catch (error) {
      console.error('AI status analysis error:', error);
      
      // Display error in chat
      const errorMessage = document.createElement('div');
      errorMessage.className = 'chat-message ai-message';
      errorMessage.innerHTML = `
        <strong>⚠️ AI Analysis Error:</strong>
        <p>Failed to get AI analysis: ${this.escapeHtml(error.message)}</p>
      `;
      
      chatMessages.appendChild(errorMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      
    } finally {
      // Reset button state
      aiStatusBtn.classList.remove('loading');
      aiStatusBtn.textContent = '🧠 AI Status Analysis';
    }
  }

  async handleAICoordination() {
    const aiCoordinateBtn = document.getElementById('ai-coordinate-btn');
    const chatMessages = document.getElementById('chat-messages');
    
    // Show loading state
    aiCoordinateBtn.classList.add('loading');
    aiCoordinateBtn.textContent = '🔄 Coordinating...';
    
    try {
      console.log('🔗 Requesting AI task coordination');
      
      const response = await fetch('/api/ai/coordinate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Display task relationships
        let relationshipsHtml = '';
        if (data.analysis.task_relationships && data.analysis.task_relationships.length > 0) {
          relationshipsHtml = '<p><strong>🔗 Task Relationships:</strong></p><ul>';
          data.analysis.task_relationships.forEach(rel => {
            const typeIcon = rel.relationship_type === 'dependency' ? '🔸' :
                            rel.relationship_type === 'enables' ? '🚀' : '🤝';
            relationshipsHtml += `
              <li>
                ${typeIcon} <strong>${this.escapeHtml(rel.from_task)}</strong>
                <br>&nbsp;&nbsp;&nbsp;→ ${this.escapeHtml(rel.to_task)}
                <br>&nbsp;&nbsp;&nbsp;<em>${this.escapeHtml(rel.description)}</em>
              </li>
            `;
          });
          relationshipsHtml += '</ul>';
        }
        
        // Display coordination message
        const coordinationMessage = document.createElement('div');
        coordinationMessage.className = 'chat-message ai-message';
        coordinationMessage.innerHTML = `
          <strong>🔗 AI Task Coordination:</strong>
          ${relationshipsHtml}
          <p><strong>💡 Suggestions:</strong></p>
          <ul>
            ${data.analysis.coordination_suggestions.map(s => `<li>${this.escapeHtml(s)}</li>`).join('')}
          </ul>
          <p><strong>⚡ Optimization Opportunities:</strong></p>
          <ul>
            ${data.analysis.optimization_opportunities.map(o => `<li>${this.escapeHtml(o)}</li>`).join('')}
          </ul>
          <small style="opacity: 0.7;">AI Service: ${data.aiService.provider} (${data.aiService.model})</small>
        `;
        
        chatMessages.appendChild(coordinationMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        this.addActivityItem('AI task coordination completed', 'just now');
        
      } else {
        throw new Error(data.error || 'Coordination failed');
      }
      
    } catch (error) {
      console.error('AI coordination error:', error);
      
      // Display error in chat
      const errorMessage = document.createElement('div');
      errorMessage.className = 'chat-message ai-message';
      errorMessage.innerHTML = `
        <strong>⚠️ AI Coordination Error:</strong>
        <p>Failed to get task coordination: ${this.escapeHtml(error.message)}</p>
      `;
      
      chatMessages.appendChild(errorMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      
    } finally {
      // Reset button state
      aiCoordinateBtn.classList.remove('loading');
      aiCoordinateBtn.textContent = '🔗 Coordinate Tasks';
    }
  }

  setupProgressRecording() {
    const progressBtn = document.getElementById('progress-btn');
    const progressInput = document.getElementById('progress-input');
    
    if (progressBtn && progressInput) {
      progressBtn.addEventListener('click', async () => {
        await this.handleProgressRecording();
      });
      
      // Allow Enter key to submit
      progressInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          await this.handleProgressRecording();
        }
      });
    }
  }

  async handleProgressRecording() {
    const progressBtn = document.getElementById('progress-btn');
    const progressInput = document.getElementById('progress-input');
    const chatMessages = document.getElementById('chat-messages');
    
    const description = progressInput.value.trim();
    if (!description) {
      progressInput.focus();
      progressInput.style.borderColor = '#ef4444';
      setTimeout(() => {
        progressInput.style.borderColor = '';
      }, 2000);
      return;
    }
    
    // Show loading state
    progressBtn.classList.add('loading');
    progressBtn.textContent = '🔄 Saving...';
    progressBtn.disabled = true;
    
    try {
      console.log('💾 Recording progress:', description);
      
      const response = await fetch('/api/ai/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ description })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Display progress analysis in chat
        const progressMessage = document.createElement('div');
        progressMessage.className = 'chat-message ai-message';
        progressMessage.innerHTML = `
          <strong>💾 Progress Recorded:</strong>
          <p><strong>Analysis:</strong> ${this.escapeHtml(data.analysis.analysis)}</p>
          <p><strong>Suggestions:</strong></p>
          <ul>
            ${data.analysis.suggestions.map(s => `<li>${this.escapeHtml(s)}</li>`).join('')}
          </ul>
          <p><strong>Reasoning:</strong> ${this.escapeHtml(data.analysis.reasoning)}</p>
          ${data.fileUpdateApplied ? 
            '<p style="color: #10b981;">✅ File updates applied</p>' : 
            '<p style="color: #f59e0b;">⏸️ File updates cancelled by user</p>'
          }
          <small style="opacity: 0.7;">AI Service: ${data.aiService.provider} (${data.aiService.model})</small>
        `;
        
        chatMessages.appendChild(progressMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Clear input and show success
        progressInput.value = '';
        this.addActivityItem(`Progress recorded: ${description.substring(0, 40)}...`, 'just now');
        
      } else {
        throw new Error(data.error || 'Progress recording failed');
      }
      
    } catch (error) {
      console.error('Progress recording error:', error);
      
      // Display error in chat
      const errorMessage = document.createElement('div');
      errorMessage.className = 'chat-message ai-message';
      errorMessage.innerHTML = `
        <strong>⚠️ Progress Recording Error:</strong>
        <p>Failed to record progress: ${this.escapeHtml(error.message)}</p>
      `;
      
      chatMessages.appendChild(errorMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      
    } finally {
      // Reset button state
      progressBtn.classList.remove('loading');
      progressBtn.textContent = '💾 Save Progress';
      progressBtn.disabled = false;
    }
  }

  async handleAIReflection() {
    const aiReflectBtn = document.getElementById('ai-reflect-btn');
    const chatMessages = document.getElementById('chat-messages');
    
    // Show loading state
    aiReflectBtn.classList.add('loading');
    aiReflectBtn.textContent = '🔄 Reflecting...';
    
    try {
      console.log('✨ Requesting AI reflection');
      
      const response = await fetch('/api/ai/reflect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Display reflection insights
        let insightsHtml = '<p><strong>🔍 Key Insights:</strong></p><ul>';
        data.reflection.reflection_insights.forEach(insight => {
          const confidenceIcon = insight.confidence === 'high' ? '🟢' : 
                                 insight.confidence === 'medium' ? '🟡' : '🔴';
          insightsHtml += `
            <li>
              ${confidenceIcon} <strong>${this.escapeHtml(insight.category)}:</strong>
              <br>&nbsp;&nbsp;&nbsp;${this.escapeHtml(insight.insight)}
            </li>
          `;
        });
        insightsHtml += '</ul>';
        
        // Display reflection message
        const reflectionMessage = document.createElement('div');
        reflectionMessage.className = 'chat-message ai-message';
        reflectionMessage.innerHTML = `
          <strong>✨ AI Reflection Analysis:</strong>
          ${insightsHtml}
          <p><strong>💡 Improvement Suggestions:</strong></p>
          <ul>
            ${data.reflection.improvement_suggestions.map(s => `<li>${this.escapeHtml(s)}</li>`).join('')}
          </ul>
          <p><strong>🎯 Goal Alignment (${data.reflection.goal_alignment.alignment_score}%):</strong></p>
          <p>${this.escapeHtml(data.reflection.goal_alignment.current_focus)}</p>
          <p><strong>⚡ Momentum: ${data.reflection.momentum_assessment.overall_momentum}</strong></p>
          <p>${this.escapeHtml(data.reflection.momentum_assessment.completion_trajectory)}</p>
          <small style="opacity: 0.7;">AI Service: ${data.aiService.provider} (${data.aiService.model})</small>
        `;
        
        chatMessages.appendChild(reflectionMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        this.addActivityItem('AI reflection analysis completed', 'just now');
        
      } else {
        throw new Error(data.error || 'Reflection failed');
      }
      
    } catch (error) {
      console.error('AI reflection error:', error);
      
      // Display error in chat
      const errorMessage = document.createElement('div');
      errorMessage.className = 'chat-message ai-message';
      errorMessage.innerHTML = `
        <strong>⚠️ AI Reflection Error:</strong>
        <p>Failed to generate reflection: ${this.escapeHtml(error.message)}</p>
      `;
      
      chatMessages.appendChild(errorMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      
    } finally {
      // Reset button state
      aiReflectBtn.classList.remove('loading');
      aiReflectBtn.textContent = '✨ AI Reflection';
    }
  }

  setupNavigationControls() {
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const workspaceInitBtn = document.getElementById('workspace-init-btn');
    
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', async () => {
        await this.handleZoomNavigation('in');
      });
    }
    
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', async () => {
        await this.handleZoomNavigation('out');
      });
    }
    
    if (workspaceInitBtn) {
      workspaceInitBtn.addEventListener('click', () => {
        this.showWorkspaceInitModal();
      });
    }
    
    // Workspace initialization modal handlers
    const workspaceModal = document.getElementById('workspace-init-modal');
    const workspaceModalCloseBtn = document.getElementById('workspace-modal-close-btn');
    const cancelWorkspaceBtn = document.getElementById('cancel-workspace-btn');
    const initWorkspaceBtn = document.getElementById('init-workspace-btn');
    
    if (workspaceModalCloseBtn) {
      workspaceModalCloseBtn.addEventListener('click', () => {
        this.hideWorkspaceInitModal();
      });
    }
    
    if (cancelWorkspaceBtn) {
      cancelWorkspaceBtn.addEventListener('click', () => {
        this.hideWorkspaceInitModal();
      });
    }
    
    if (initWorkspaceBtn) {
      initWorkspaceBtn.addEventListener('click', async () => {
        await this.handleWorkspaceInit();
      });
    }
    
    // Close modal when clicking outside
    if (workspaceModal) {
      workspaceModal.addEventListener('click', (e) => {
        if (e.target === workspaceModal) {
          this.hideWorkspaceInitModal();
        }
      });
    }
  }
  
  async handleZoomNavigation(direction) {
    const zoomBtn = document.getElementById(`zoom-${direction}-btn`);
    const chatMessages = document.getElementById('chat-messages');
    
    // Show loading state
    zoomBtn.classList.add('loading');
    zoomBtn.textContent = direction === 'in' ? '🔄 Zooming In...' : '🔄 Zooming Out...';
    
    try {
      console.log(`🔍 Zoom ${direction} navigation requested`);
      
      const response = await fetch('/api/zoom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ direction })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Display zoom navigation result
        const zoomMessage = document.createElement('div');
        zoomMessage.className = 'chat-message ai-message';
        zoomMessage.innerHTML = `
          <strong>🔍 Zoom Navigation:</strong>
          <p><strong>Context Shift:</strong> ${this.escapeHtml(data.zoom.context_shift)}</p>
          <p><strong>New Focus:</strong> ${this.escapeHtml(data.zoom.level_name)}</p>
          <p><strong>Recommendation:</strong> ${this.escapeHtml(data.zoom.recommended_focus)}</p>
          <p><strong>Next Steps:</strong> ${this.escapeHtml(data.zoom.available_tasks)}</p>
        `;
        
        chatMessages.appendChild(zoomMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        this.addActivityItem(`Zoomed ${direction} to Level ${data.zoom.new_level}`, 'just now');
        
      } else {
        throw new Error(data.error || 'Zoom navigation failed');
      }
      
    } catch (error) {
      console.error('Zoom navigation error:', error);
      
      // Display error in chat
      const errorMessage = document.createElement('div');
      errorMessage.className = 'chat-message ai-message';
      errorMessage.innerHTML = `
        <strong>⚠️ Zoom Navigation Error:</strong>
        <p>Failed to navigate: ${this.escapeHtml(error.message)}</p>
      `;
      
      chatMessages.appendChild(errorMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      
    } finally {
      // Reset button state
      zoomBtn.classList.remove('loading');
      zoomBtn.textContent = direction === 'in' ? '🔍 Zoom In' : '🔍 Zoom Out';
    }
  }
  
  showWorkspaceInitModal() {
    const modal = document.getElementById('workspace-init-modal');
    const directoryField = document.getElementById('workspace-directory');
    
    // Show modal
    if (modal) {
      modal.classList.remove('hidden');
      // Focus on directory field
      setTimeout(() => {
        if (directoryField) directoryField.focus();
      }, 100);
    }
  }
  
  hideWorkspaceInitModal() {
    const modal = document.getElementById('workspace-init-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }
  
  async handleWorkspaceInit() {
    const directoryField = document.getElementById('workspace-directory');
    const initBtn = document.getElementById('init-workspace-btn');
    const chatMessages = document.getElementById('chat-messages');
    
    const directory = directoryField?.value.trim();
    
    // Validation
    if (!directory) {
      if (directoryField) {
        directoryField.focus();
        directoryField.style.borderColor = '#ef4444';
        setTimeout(() => {
          directoryField.style.borderColor = '';
        }, 2000);
      }
      return;
    }
    
    // Show loading state
    const originalText = initBtn?.textContent;
    if (initBtn) {
      initBtn.textContent = '🔄 Initializing...';
      initBtn.disabled = true;
    }
    
    try {
      console.log('🏗️ Workspace initialization requested for:', directory);
      
      const response = await fetch('/api/workspace/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ directory })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Workspace initialized successfully:', data.result);
        
        // Hide modal
        this.hideWorkspaceInitModal();
        
        // Show success message in chat
        if (chatMessages) {
          const successMessage = document.createElement('div');
          successMessage.className = 'chat-message ai-message';
          successMessage.innerHTML = `
            <strong>✅ Workspace Initialized:</strong>
            <p><strong>Location:</strong> ${this.escapeHtml(data.result.directory)}</p>
            <p><strong>Created Files:</strong></p>
            <ul>
              ${data.result.created_files.map(file => `<li>${this.escapeHtml(file)}</li>`).join('')}
            </ul>
            <p><strong>Next Steps:</strong></p>
            <ul>
              ${data.result.next_steps.map(step => `<li>${this.escapeHtml(step)}</li>`).join('')}
            </ul>
          `;
          chatMessages.appendChild(successMessage);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Log activity
        this.addActivityItem(`Initialized workspace: ${directory}`, 'just now');
        
      } else {
        throw new Error(data.error || 'Failed to initialize workspace');
      }
      
    } catch (error) {
      console.error('Error initializing workspace:', error);
      
      // Show error message
      if (chatMessages) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'chat-message ai-message';
        errorMessage.innerHTML = `
          <strong>⚠️ Workspace Initialization Error:</strong>
          <p>Failed to initialize workspace: ${this.escapeHtml(error.message)}</p>
        `;
        chatMessages.appendChild(errorMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
      
    } finally {
      // Reset button state
      if (initBtn && originalText) {
        initBtn.textContent = originalText;
        initBtn.disabled = false;
      }
    }
  }

  setupProjectManagement() {
    const createProjectBtn = document.getElementById('create-project-btn');
    const createProjectModal = document.getElementById('create-project-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const cancelProjectBtn = document.getElementById('cancel-project-btn');
    const saveProjectBtn = document.getElementById('save-project-btn');
    
    // Show modal when create button is clicked
    if (createProjectBtn) {
      createProjectBtn.addEventListener('click', () => {
        this.showCreateProjectModal();
      });
    }
    
    // Hide modal when close buttons are clicked
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', () => {
        this.hideCreateProjectModal();
      });
    }
    
    if (cancelProjectBtn) {
      cancelProjectBtn.addEventListener('click', () => {
        this.hideCreateProjectModal();
      });
    }
    
    // Handle form submission
    if (saveProjectBtn) {
      saveProjectBtn.addEventListener('click', async () => {
        await this.handleCreateProject();
      });
    }
    
    // Close modal when clicking outside
    if (createProjectModal) {
      createProjectModal.addEventListener('click', (e) => {
        if (e.target === createProjectModal) {
          this.hideCreateProjectModal();
        }
      });
    }
    
    // Handle Enter key in form fields
    ['project-name', 'project-goal'].forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('keypress', async (e) => {
          if (e.key === 'Enter' && e.shiftKey === false) {
            e.preventDefault();
            await this.handleCreateProject();
          }
        });
      }
    });
  }
  
  showCreateProjectModal() {
    const modal = document.getElementById('create-project-modal');
    const nameField = document.getElementById('project-name');
    const goalField = document.getElementById('project-goal');
    const levelField = document.getElementById('project-level');
    
    // Reset form
    if (nameField) nameField.value = '';
    if (goalField) goalField.value = '';
    if (levelField) levelField.value = '2';
    
    // Show modal
    if (modal) {
      modal.classList.remove('hidden');
      // Focus on name field
      setTimeout(() => {
        if (nameField) nameField.focus();
      }, 100);
    }
  }
  
  hideCreateProjectModal() {
    const modal = document.getElementById('create-project-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }
  
  async handleCreateProject() {
    const nameField = document.getElementById('project-name');
    const goalField = document.getElementById('project-goal');
    const levelField = document.getElementById('project-level');
    const saveBtn = document.getElementById('save-project-btn');
    
    const name = nameField?.value.trim();
    const goal = goalField?.value.trim();
    const level = levelField?.value || '2';
    
    // Validation
    if (!name) {
      if (nameField) {
        nameField.focus();
        nameField.style.borderColor = '#ef4444';
        setTimeout(() => {
          nameField.style.borderColor = '';
        }, 2000);
      }
      return;
    }
    
    if (!goal) {
      if (goalField) {
        goalField.focus();
        goalField.style.borderColor = '#ef4444';
        setTimeout(() => {
          goalField.style.borderColor = '';
        }, 2000);
      }
      return;
    }
    
    // Show loading state
    const originalText = saveBtn?.textContent;
    if (saveBtn) {
      saveBtn.textContent = '🔄 Creating...';
      saveBtn.disabled = true;
    }
    
    try {
      console.log('📋 Creating project:', name);
      
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, goal, level: parseInt(level) })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Project created successfully:', data.project);
        
        // Hide modal
        this.hideCreateProjectModal();
        
        // Show success message in chat
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
          const successMessage = document.createElement('div');
          successMessage.className = 'chat-message ai-message';
          successMessage.innerHTML = `
            <strong>✅ Project Created:</strong>
            <p><strong>${this.escapeHtml(data.project.displayName)}</strong> has been created successfully!</p>
            <p>You can now start adding tasks and tracking progress.</p>
          `;
          chatMessages.appendChild(successMessage);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Refresh project list
        await this.loadProjectsList();
        
        // Log activity
        this.addActivityItem(`Created project: ${name}`, 'just now');
        
      } else {
        throw new Error(data.error || 'Failed to create project');
      }
      
    } catch (error) {
      console.error('Error creating project:', error);
      
      // Show error message
      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'chat-message ai-message';
        errorMessage.innerHTML = `
          <strong>⚠️ Project Creation Error:</strong>
          <p>Failed to create project: ${this.escapeHtml(error.message)}</p>
        `;
        chatMessages.appendChild(errorMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
      
    } finally {
      // Reset button state
      if (saveBtn && originalText) {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
      }
    }
  }
  
  async loadProjectsList() {
    try {
      console.log('📋 Loading projects list');
      
      const response = await fetch('/api/projects/list');
      const data = await response.json();
      
      const projectsList = document.getElementById('projects-list');
      
      if (data.success && data.projects && data.projects.length > 0) {
        const projectsHtml = data.projects.map(project => `
          <div class="project-card">
            <div class="project-card-header">
              <h3 class="project-title">${this.escapeHtml(project.displayName)}</h3>
              <span class="project-status">${this.escapeHtml(project.status)}</span>
            </div>
            <p class="project-goal">${this.escapeHtml(project.goal)}</p>
            <div class="project-progress">
              <div class="project-progress-label">
                <span>Progress</span>
                <span>${project.completionRate}%</span>
              </div>
              <div class="project-progress-bar">
                <div class="project-progress-fill" style="width: ${project.completionRate}%"></div>
              </div>
            </div>
            <div class="project-actions">
              <button class="project-btn" onclick="dashboard.viewProject('${project.name}')">📋 View Tasks</button>
              <button class="project-btn" onclick="dashboard.editProject('${project.name}')">✏️ Edit</button>
              <button class="project-btn" onclick="dashboard.archiveProject('${project.name}')">📦 Archive</button>
            </div>
          </div>
        `).join('');
        
        projectsList.innerHTML = projectsHtml;
        
      } else {
        projectsList.innerHTML = `
          <div class="empty-state">
            <h3>No projects found</h3>
            <p>Create your first project to start organizing your work!</p>
          </div>
        `;
      }
      
    } catch (error) {
      console.error('Error loading projects:', error);
      const projectsList = document.getElementById('projects-list');
      if (projectsList) {
        projectsList.innerHTML = '<div class="loading">Failed to load projects</div>';
      }
    }
  }
  
  // Project action methods
  async viewProject(projectName) {
    console.log('📋 View project:', projectName);
    
    try {
      const response = await fetch(`/api/projects/${projectName}`);
      const data = await response.json();
      
      if (data.success) {
        // Show project details in a modal or dedicated view
        this.showProjectDetailsModal(data.project);
      } else {
        throw new Error(data.error || 'Failed to load project');
      }
      
    } catch (error) {
      console.error('Error loading project details:', error);
      this.addChatMessage(`Failed to open project: ${error.message}`, false);
    }
  }
  
  showProjectDetailsModal(project) {
    // Create a detailed project view modal
    const modalHtml = `
      <div id="project-details-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>📋 ${this.escapeHtml(project.displayName)}</h3>
            <button class="modal-close" onclick="this.hideProjectDetailsModal()">×</button>
          </div>
          <div class="modal-body">
            <div class="project-meta">
              <p><strong>Status:</strong> ${this.escapeHtml(project.status)}</p>
              <p><strong>Goal:</strong> ${this.escapeHtml(project.goal)}</p>
              <p><strong>Progress:</strong> ${project.completionRate}% (${project.completedTasks}/${project.totalTasks} tasks)</p>
            </div>
            
            <div class="project-tasks">
              <h4>📝 Tasks by Level</h4>
              ${this.renderTasksByLevel(project.tasks)}
            </div>
            
            <div class="add-task-section">
              <h4>➕ Add New Task</h4>
              <form id="add-task-form">
                <div class="form-group">
                  <label for="task-description">Task Description</label>
                  <input type="text" id="task-description" placeholder="Enter task description..." />
                </div>
                <div class="form-group">
                  <label for="task-level">Task Level</label>
                  <select id="task-level">
                    <option value="0">Level 0 - Next 15 minutes</option>
                    <option value="1">Level 1 - This Week</option>
                    <option value="2" selected>Level 2 - Current Sprint</option>
                    <option value="3">Level 3 - Quarterly</option>
                    <option value="4">Level 4 - Life Goal</option>
                  </select>
                </div>
                <button type="button" class="btn-primary" onclick="dashboard.addTaskToProject('${project.name}')">Add Task</button>
              </form>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="dashboard.hideProjectDetailsModal()">Close</button>
          </div>
        </div>
      </div>
    `;
    
    // Remove existing modal if present
    const existing = document.getElementById('project-details-modal');
    if (existing) existing.remove();
    
    // Add new modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
  
  renderTasksByLevel(tasks) {
    const levelNames = {
      0: 'Level 0 - Next 15 minutes',
      1: 'Level 1 - This Week',
      2: 'Level 2 - Current Sprint', 
      3: 'Level 3 - Quarterly',
      4: 'Level 4 - Life Goal'
    };
    
    let html = '';
    for (let level = 0; level <= 4; level++) {
      const levelTasks = tasks[level] || [];
      if (levelTasks.length > 0) {
        html += `
          <div class="level-tasks">
            <h5>${levelNames[level]}</h5>
            <ul class="task-list">
              ${levelTasks.map(task => `
                <li class="task-item ${task.completed ? 'completed' : ''}">
                  <span class="task-check">${task.completed ? '✅' : '◯'}</span>
                  <span class="task-text">${this.escapeHtml(task.description)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        `;
      }
    }
    
    return html || '<p class="empty-tasks">No tasks found. Add your first task below!</p>';
  }
  
  hideProjectDetailsModal() {
    const modal = document.getElementById('project-details-modal');
    if (modal) modal.remove();
  }
  
  async addTaskToProject(projectName) {
    const taskInput = document.getElementById('task-description');
    const levelSelect = document.getElementById('task-level');
    
    const task = taskInput?.value.trim();
    const level = levelSelect?.value;
    
    if (!task) {
      if (taskInput) {
        taskInput.focus();
        taskInput.style.borderColor = '#ef4444';
        setTimeout(() => {
          taskInput.style.borderColor = '';
        }, 2000);
      }
      return;
    }
    
    try {
      console.log(`📝 Adding task to ${projectName}:`, task);
      
      const response = await fetch(`/api/projects/${projectName}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task, level: parseInt(level) })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Task added successfully:', data.task);
        
        // Clear form
        if (taskInput) taskInput.value = '';
        if (levelSelect) levelSelect.value = '2';
        
        // Show success in chat
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
          const successMessage = document.createElement('div');
          successMessage.className = 'chat-message ai-message';
          successMessage.innerHTML = `
            <strong>✅ Task Added:</strong>
            <p><strong>"${this.escapeHtml(data.task.description)}"</strong> added to ${this.escapeHtml(projectName)} at Level ${data.task.level}</p>
          `;
          chatMessages.appendChild(successMessage);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Refresh the project details modal
        this.hideProjectDetailsModal();
        setTimeout(() => {
          this.viewProject(projectName);
        }, 100);
        
        this.addActivityItem(`Added task to ${projectName}: ${task}`, 'just now');
        
      } else {
        throw new Error(data.error || 'Failed to add task');
      }
      
    } catch (error) {
      console.error('Error adding task:', error);
      
      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'chat-message ai-message';
        errorMessage.innerHTML = `
          <strong>⚠️ Task Addition Error:</strong>
          <p>Failed to add task: ${this.escapeHtml(error.message)}</p>
        `;
        chatMessages.appendChild(errorMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }
  }
  
  editProject(projectName) {
    console.log('✏️ Edit project:', projectName);
    // TODO: Implement project editing
    this.addChatMessage(`Editing project: ${projectName}`, false);
  }
  
  archiveProject(projectName) {
    console.log('📦 Archive project:', projectName);
    // TODO: Implement project archiving
    this.addChatMessage(`Archiving project: ${projectName}`, false);
  }
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 Initializing Productivity Dashboard');
  dashboard = new ProductivityDashboard();
});