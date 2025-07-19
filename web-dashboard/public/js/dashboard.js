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
        this.loadWorkspaceData();
        this.loadProjectsData();
      }, 500);
    });

    this.socket.on('error', (error) => {
      console.error('🚨 Socket error:', error);
      this.addActivityItem('Connection error occurred', 'just now');
    });
  }

  setupEventListeners() {
    // Feedback system
    const feedbackButtons = document.querySelectorAll('.btn-feedback');
    feedbackButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove previous selection
        feedbackButtons.forEach(b => b.classList.remove('selected'));
        
        // Select current button
        btn.classList.add('selected');
        this.feedbackData.rating = btn.dataset.feedback;
      });
    });

    const submitFeedbackBtn = document.getElementById('submit-feedback');
    const feedbackText = document.getElementById('feedback-text');
    
    submitFeedbackBtn.addEventListener('click', () => {
      this.feedbackData.text = feedbackText.value;
      this.submitFeedback();
    });

    // Auto-refresh every 30 seconds
    setInterval(() => {
      this.loadWorkspaceData();
      this.loadProjectsData();
    }, 30000);
  }

  async loadInitialData() {
    await Promise.all([
      this.loadWorkspaceData(),
      this.loadProjectsData()
    ]);
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