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
        switchMode(btn.dataset.mode);
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
              
              projectLevels[level].forEach(task => {
                const taskClass = task.completed ? 'completed' : 'pending';
                const checkIcon = task.completed ? '✅' : '◯';
                levelHtml += `
                  <div class="plan-task ${taskClass}">
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
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 Initializing Productivity Dashboard');
  new ProductivityDashboard();
});