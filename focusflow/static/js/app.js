// FocusFlow JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize drag and drop
    initDragAndDrop();

    // Initialize task form
    initTaskForm();

    // Initialize delete buttons
    initDeleteButtons();

    // Initialize edit buttons
    initEditTask();
});

// Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    // Style based on type
    if (type === 'error') {
        toast.style.borderLeft = '4px solid var(--accent-secondary)';
    } else {
        toast.style.borderLeft = '4px solid var(--primary)';
    }
    
    toast.textContent = message;
    container.appendChild(toast);

    // Remove after animation completes (3 seconds)
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function initDragAndDrop() {
    const taskLists = document.querySelectorAll('.task-list');

    taskLists.forEach(list => {
        list.addEventListener('dragover', handleDragOver);
        list.addEventListener('drop', handleDrop);
    });

    // Event delegation for dragstart since tasks are added dynamically
    document.addEventListener('dragstart', function(e) {
        if (e.target.classList.contains('task-card')) {
            handleDragStart(e);
        }
    });
}

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
    e.target.style.opacity = '0.5';
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    
    const kanbanColumn = e.target.closest('.kanban-column');
    if (!kanbanColumn) return;
    
    const newStatus = kanbanColumn.dataset.status;
    const taskList = kanbanColumn.querySelector('.task-list');

    // Update UI
    const taskCard = document.querySelector(`[data-id="${taskId}"]`);
    if (taskCard) {
        taskCard.style.opacity = '1';
        taskList.appendChild(taskCard);
    }

    // Update database
    fetch('/update_task_status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `id=${taskId}&status=${newStatus}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Optional toast for moving
            // showToast(`Task moved to ${newStatus}`);
        } else {
            showToast('Failed to update task status', 'error');
        }
    })
    .catch(() => {
        showToast('Network error occurred', 'error');
    });
}

function initTaskForm() {
    const form = document.getElementById('add-task-form');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const titleInput = document.getElementById('task-title');
        const descInput = document.getElementById('task-description');
        
        const title = titleInput.value;
        const description = descInput.value;

        fetch('/add_task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Dynamically create task card HTML
                const cardHtml = `
                    <div class="task-card glass" data-id="${data.id}" draggable="true">
                        <h4 class="task-title">${data.title}</h4>
                        <p class="task-desc" ${data.description ? '' : 'style="display: none;"'}>${data.description}</p>
                        <div class="pomodoro-badge">🍅 <span class="pomodoro-count">0</span></div>
                        <div class="task-actions">
                            <a href="/timer?task_id=${data.id}" class="icon-btn focus-task" title="Focus Timer">⏱️</a>
                            <button class="icon-btn edit-task" data-id="${data.id}" title="Edit Task">✏️</button>
                            <button class="icon-btn delete-task" data-id="${data.id}" title="Delete Task">×</button>
                        </div>
                    </div>
                `;
                
                // Append to To Do list
                const todoList = document.getElementById('todo-list');
                todoList.insertAdjacentHTML('afterbegin', cardHtml);
                
                // Reset form
                titleInput.value = '';
                descInput.value = '';
                showToast('Task added successfully!');
            } else {
                showToast('Failed to add task', 'error');
            }
        });
    });
}

function initDeleteButtons() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-task')) {
            const taskId = e.target.dataset.id;
            // We use a simple confirm dialog or could implement a modal
            if (confirm('Delete this task?')) {
                fetch('/delete_task', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `id=${taskId}`
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        e.target.closest('.task-card').remove();
                        showToast('Task deleted');
                    } else {
                        showToast('Failed to delete task', 'error');
                    }
                });
            }
        }
    });
}

function initEditTask() {
    const modal = document.getElementById('edit-task-modal');
    const closeBtn = document.getElementById('close-edit-modal');
    const form = document.getElementById('edit-task-form');
    
    if (!modal || !form) return;

    // Open Modal
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('edit-task')) {
            const taskId = e.target.dataset.id;
            const card = e.target.closest('.task-card');
            const title = card.querySelector('.task-title').textContent;
            const descEl = card.querySelector('.task-desc');
            const desc = descEl ? descEl.textContent : '';

            document.getElementById('edit-task-id').value = taskId;
            document.getElementById('edit-task-title').value = title;
            document.getElementById('edit-task-description').value = desc;
            
            modal.style.display = 'flex';
        }
    });

    // Close Modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Save Edit
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const taskId = document.getElementById('edit-task-id').value;
        const title = document.getElementById('edit-task-title').value;
        const description = document.getElementById('edit-task-description').value;

        fetch('/edit_task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `id=${taskId}&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update UI
                const card = document.querySelector(`.task-card[data-id="${taskId}"]`);
                if (card) {
                    card.querySelector('.task-title').textContent = title;
                    const descEl = card.querySelector('.task-desc');
                    if (description) {
                        descEl.textContent = description;
                        descEl.style.display = 'block';
                    } else {
                        descEl.textContent = '';
                        descEl.style.display = 'none';
                    }
                }
                modal.style.display = 'none';
                showToast('Task updated successfully!');
            } else {
                showToast('Failed to update task', 'error');
            }
        });
    });
}