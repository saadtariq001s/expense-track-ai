// Enhanced dashboard.js
document.addEventListener('DOMContentLoaded', function() {
  // Initialize variables
  let expenses = [];
  let categoryChart = null;
  let monthlyChart = null;
  
  // DOM elements
  const expenseForm = document.getElementById('expenseForm');
  const quickExpenseForm = document.getElementById('quickExpenseForm');
  const saveQuickExpense = document.getElementById('saveQuickExpense');
  const expensesTable = document.getElementById('expensesTable');
  const editExpenseModal = new bootstrap.Modal(document.getElementById('editExpenseModal'));
  const quickAddModal = new bootstrap.Modal(document.getElementById('quickAddModal'));
  const editExpenseForm = document.getElementById('editExpenseForm');
  const saveExpenseChanges = document.getElementById('saveExpenseChanges');
  
  // Initialize tooltips and popovers if they exist
  if (typeof bootstrap.Tooltip !== 'undefined') {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }
  
  if (typeof bootstrap.Popover !== 'undefined') {
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
      return new bootstrap.Popover(popoverTriggerEl);
    });
  }
  
  // Set default date in forms
  const todayStr = new Date().toISOString().split('T')[0];
  if (document.getElementById('expenseDate')) {
    document.getElementById('expenseDate').value = todayStr;
  }
  if (document.getElementById('quickDate')) {
    document.getElementById('quickDate').value = todayStr;
  }
  
  // Fetch expenses and update UI
  fetchExpenses();
  
  // Also fetch insights
  fetchInsights();
  
  // Event listeners
  if (expenseForm) {
    expenseForm.addEventListener('submit', handleAddExpense);
  }
  
  if (saveQuickExpense) {
    saveQuickExpense.addEventListener('click', handleQuickAddExpense);
  }
  
  if (expensesTable) {
    expensesTable.addEventListener('click', handleTableActions);
  }
  
  if (saveExpenseChanges) {
    saveExpenseChanges.addEventListener('click', handleUpdateExpense);
  }
  
  // Fetch all expenses from API
  async function fetchExpenses() {
    try {
      console.log('Fetching expenses...');
      const response = await fetch('/api/expenses');
      if (!response.ok) {
        throw new Error(`Failed to fetch expenses: ${response.status} ${response.statusText}`);
      }
      
      expenses = await response.json();
      console.log('Expenses fetched:', expenses);
      
      renderExpensesTable();
      fetchExpenseSummary();
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showAlert('Could not load expenses: ' + error.message, 'danger');
    }
  }
  
  // Fetch expense summary for charts
  async function fetchExpenseSummary() {
    try {
      console.log('Fetching expense summary...');
      const response = await fetch('/api/expenses/summary');
      if (!response.ok) {
        throw new Error(`Failed to fetch expense summary: ${response.status} ${response.statusText}`);
      }
      
      const summary = await response.json();
      console.log('Summary fetched:', summary);
      
      renderCharts(summary);
    } catch (error) {
      console.error('Error fetching expense summary:', error);
      showAlert('Could not load expense summary: ' + error.message, 'danger');
    }
  }
  
  // Fetch insights for additional summary information
  async function fetchInsights() {
    try {
      const response = await fetch('/api/expenses/insights');
      if (!response.ok) throw new Error('Failed to fetch insights');
      
      const insights = await response.json();
      renderInsights(insights);
    } catch (error) {
      console.error('Error fetching insights:', error);
      if (document.getElementById('spendingInsights')) {
        document.getElementById('spendingInsights').innerHTML = `
          <div class="alert alert-warning" role="alert">
            <i class="bi bi-exclamation-circle me-2"></i>
            Could not load spending insights. Please try again later.
          </div>
        `;
      }
    }
  }
  
  // Handle quick add expense
  async function handleQuickAddExpense() {
    const amount = document.getElementById('quickAmount').value;
    const currency = document.getElementById('quickCurrency').value;
    const description = document.getElementById('quickDescription').value;
    const date = document.getElementById('quickDate').value || new Date().toISOString().split('T')[0];
    const rawCategory = document.getElementById('quickCategory').value;
    
    if (!amount || !description) {
      showAlert('Please fill in all required fields', 'warning');
      return;
    }
    
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          currency,
          description,
          date,
          rawCategory
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add expense: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const expense = await response.json();
      console.log('Expense added successfully:', expense);
      
      // Add to beginning of array
      expenses.unshift(expense);
      
      // Clear form
      document.getElementById('quickExpenseForm').reset();
      
      // Close modal
      quickAddModal.hide();
      
      // Update UI
      renderExpensesTable();
      fetchExpenseSummary();
      fetchInsights();
      showAlert('Expense added successfully!', 'success');
    } catch (error) {
      console.error('Error adding expense:', error);
      showAlert('Could not add expense: ' + error.message, 'danger');
    }
  }
  
  // Render insights section with improved UI
  function renderInsights(insightsData) {
    const insightsContainer = document.getElementById('spendingInsights');
    if (!insightsContainer) return;
    
    if (!insightsData.insights || insightsData.insights.length === 0) {
      insightsContainer.innerHTML = `
        <div class="alert alert-info" role="alert">
          <i class="bi bi-info-circle me-2"></i>
          Add more expenses to see detailed spending insights!
        </div>
      `;
      return;
    }
    
    // Format currency function
    const formatCurrency = (value, currency = 'PKR') => {
      return `${currency} ${parseFloat(value).toFixed(2)}`;
    };
    
    // Main insight cards
    let insightsHtml = `
      <div class="row mb-4">
        <div class="col-md-4 mb-3">
          <div class="card h-100 border-0">
            <div class="card-body text-center">
              <div class="d-flex flex-column align-items-center">
                <div class="rounded-circle bg-primary bg-opacity-10 p-3 mb-3">
                  <i class="bi bi-cash-stack text-primary fs-3"></i>
                </div>
                <h6 class="text-muted mb-2">Total Spent</h6>
                <h3 class="mb-0">${formatCurrency(insightsData.totalSpent)}</h3>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-4 mb-3">
          <div class="card h-100 border-0">
            <div class="card-body text-center">
              <div class="d-flex flex-column align-items-center">
                <div class="rounded-circle bg-info bg-opacity-10 p-3 mb-3">
                  <i class="bi bi-tag text-info fs-3"></i>
                </div>
                <h6 class="text-muted mb-2">Top Category</h6>
                <h3 class="mb-0">${insightsData.topCategory || 'N/A'}</h3>
                <span class="badge bg-info mt-2">${insightsData.topCategoryPercentage || 0}% of total</span>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-4 mb-3">
          <div class="card h-100 border-0">
            <div class="card-body text-center">
              <div class="d-flex flex-column align-items-center">
                <div class="rounded-circle bg-success bg-opacity-10 p-3 mb-3">
                  <i class="bi bi-credit-card text-success fs-3"></i>
                </div>
                <h6 class="text-muted mb-2">Avg. Transaction</h6>
                <h3 class="mb-0">${formatCurrency(insightsData.avgTransactionSize || 0)}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Key insights section
    insightsHtml += `
      <div class="card border-0 mb-4">
        <div class="card-header bg-transparent border-0">
          <h6 class="mb-0"><i class="bi bi-lightbulb me-2"></i>Key Insights</h6>
        </div>
        <div class="card-body pt-0">
    `;
    
    insightsData.insights.forEach(insight => {
      // Determine icon based on insight content
      let icon = 'bi-graph-up';
      
      if (insight.includes('increased')) {
        icon = 'bi-arrow-up-circle';
      } else if (insight.includes('decreased')) {
        icon = 'bi-arrow-down-circle';
      } else if (insight.includes('category')) {
        icon = 'bi-tag';
      } else if (insight.includes('average')) {
        icon = 'bi-calculator';
      }
      
      insightsHtml += `
        <div class="insight-item">
          <i class="bi ${icon} insight-icon"></i>
          <div>
            <p class="mb-0">${insight}</p>
          </div>
        </div>
      `;
    });
    
    insightsHtml += `
        </div>
      </div>
    `;
    
    // Monthly trend indicator
    if (insightsData.monthOverMonthGrowth !== null) {
      const growthValue = parseFloat(insightsData.monthOverMonthGrowth);
      const isPositive = growthValue > 0;
      const icon = isPositive ? 'bi-arrow-up-circle-fill trend-up' : 'bi-arrow-down-circle-fill trend-down';
      const trend = isPositive ? 'increase' : 'decrease';
      const trendClass = isPositive ? 'danger' : 'success';
      
      insightsHtml += `
        <div class="card border-0">
          <div class="card-body d-flex align-items-center p-3">
            <i class="bi ${icon} fs-1 me-3"></i>
            <div>
              <h6 class="card-title">Month-over-Month Trend</h6>
              <p class="card-text">
                Your spending shows a <span class="badge bg-${trendClass}">${Math.abs(growthValue)}%</span> ${trend} compared to last month.
              </p>
            </div>
          </div>
        </div>
      `;
    }
    
    insightsContainer.innerHTML = insightsHtml;
  }
  
  // Handle adding a new expense
  async function handleAddExpense(e) {
    e.preventDefault();
    console.log('Add expense form submitted');
    
    const amount = document.getElementById('amount').value;
    const currency = document.getElementById('currency').value;
    const description = document.getElementById('description').value;
    const date = document.getElementById('expenseDate').value || new Date().toISOString().split('T')[0];
    const rawCategory = document.getElementById('rawCategory')?.value || '';
    
    if (!amount || !description) {
      showAlert('Please fill in all required fields', 'warning');
      return;
    }
    
    try {
      console.log('Sending expense data:', { amount, currency, description, date, rawCategory });
      
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          currency,
          description,
          date,
          rawCategory
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add expense: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const expense = await response.json();
      console.log('Expense added successfully:', expense);
      
      // Add to beginning of array
      expenses.unshift(expense);
      
      // Clear form
      expenseForm.reset();
      document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
      
      // Update UI
      renderExpensesTable();
      fetchExpenseSummary();
      fetchInsights();
      showAlert('Expense added successfully!', 'success');
    } catch (error) {
      console.error('Error adding expense:', error);
      showAlert('Could not add expense: ' + error.message, 'danger');
    }
  }
  
  // Handle expense table actions (edit/delete)
  function handleTableActions(e) {
    const target = e.target.closest('button');
    if (!target) return;
    
    const row = target.closest('tr');
    const expenseId = row.dataset.id;
    const expense = expenses.find(exp => exp._id === expenseId);
    
    if (target.classList.contains('edit-btn') || target.closest('.edit-btn')) {
      // Populate edit form
      document.getElementById('editExpenseId').value = expense._id;
      document.getElementById('editAmount').value = expense.amount;
      // Set the currency if it exists, otherwise default to PKR
      const currencySelect = document.getElementById('editCurrency');
      currencySelect.value = expense.currency || 'PKR';
      document.getElementById('editDescription').value = expense.description;
      document.getElementById('editExpenseDate').value = new Date(expense.date).toISOString().split('T')[0];
      if (document.getElementById('editRawCategory')) {
        document.getElementById('editRawCategory').value = expense.rawCategory || '';
      }
      
      // Show modal
      editExpenseModal.show();
    } else if (target.classList.contains('delete-btn') || target.closest('.delete-btn')) {
      // Show confirmation dialog with more details
      const expenseDate = new Date(expense.date).toLocaleDateString();
      const formattedAmount = `${expense.currency || 'PKR'} ${parseFloat(expense.amount).toFixed(2)}`;
      
      if (confirm(`Are you sure you want to delete this expense?\n\nDescription: ${expense.description}\nAmount: ${formattedAmount}\nDate: ${expenseDate}`)) {
        deleteExpense(expenseId);
      }
    }
  }
  
  // Handle updating an expense
  async function handleUpdateExpense() {
    const expenseId = document.getElementById('editExpenseId').value;
    const amount = document.getElementById('editAmount').value;
    const currency = document.getElementById('editCurrency').value;
    const description = document.getElementById('editDescription').value;
    const date = document.getElementById('editExpenseDate').value;
    const rawCategory = document.getElementById('editRawCategory')?.value || '';
    
    if (!amount || !description || !date) {
      showAlert('Please fill in all required fields', 'warning');
      return;
    }
    
    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          currency,
          description,
          date,
          rawCategory
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update expense: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const updatedExpense = await response.json();
      
      // Update expenses array
      const index = expenses.findIndex(exp => exp._id === expenseId);
      if (index !== -1) {
        expenses[index] = updatedExpense;
      }
      
      // Hide modal
      editExpenseModal.hide();
      
      // Update UI
      renderExpensesTable();
      fetchExpenseSummary();
      fetchInsights();
      showAlert('Expense updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating expense:', error);
      showAlert('Could not update expense: ' + error.message, 'danger');
    }
  }
  
  // Delete an expense
  async function deleteExpense(expenseId) {
    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete expense: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // Update expenses array
      expenses = expenses.filter(exp => exp._id !== expenseId);
      
      // Update UI
      renderExpensesTable();
      fetchExpenseSummary();
      fetchInsights();
      showAlert('Expense deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting expense:', error);
      showAlert('Could not delete expense: ' + error.message, 'danger');
    }
  }
  
  // Render expenses table with improved UI
  function renderExpensesTable() {
    if (!expensesTable) {
      console.error('Expenses table element not found');
      return;
    }
    
    console.log('Rendering expenses table with', expenses.length, 'expenses');
    
    if (expenses.length === 0) {
      expensesTable.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4">
            <div class="empty-state">
              <i class="bi bi-receipt fs-1 text-muted mb-3"></i>
              <p class="mb-0">No expenses found. Add your first expense!</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    expensesTable.innerHTML = expenses.map(expense => {
      // Determine category badge color
      let badgeClass = 'bg-info';
      const category = expense.category || 'Other';
      
      switch(category.toLowerCase()) {
        case 'food':
          badgeClass = 'bg-success';
          break;
        case 'transportation':
          badgeClass = 'bg-primary';
          break;
        case 'entertainment':
          badgeClass = 'bg-warning';
          break;
        case 'shopping':
          badgeClass = 'bg-danger';
          break;
        case 'utilities':
          badgeClass = 'bg-secondary';
          break;
        case 'health':
          badgeClass = 'bg-info';
          break;
        default:
          badgeClass = 'bg-info';
      }
      
      return `
        <tr data-id="${expense._id}">
          <td>${new Date(expense.date).toLocaleDateString()}</td>
          <td>${expense.description}</td>
          <td>
            <span class="badge ${badgeClass}">
              <i class="bi bi-tag me-1"></i>${category}
            </span>
          </td>
          <td class="fw-semibold">${expense.currency || 'PKR'} ${parseFloat(expense.amount).toFixed(2)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary edit-btn" data-bs-toggle="tooltip" title="Edit">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger delete-btn" data-bs-toggle="tooltip" title="Delete">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
    
    // Reinitialize tooltips
    if (typeof bootstrap.Tooltip !== 'undefined') {
      const tooltips = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      tooltips.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
      });
    }
  }
  
  // Render charts for expense visualization
  function renderCharts(summary) {
    if (!summary || summary.length === 0) {
      console.log('No expense data available for charts');
      return;
    }
    
    const categoryChartElement = document.getElementById('categoryChart');
    const monthlyChartElement = document.getElementById('monthlyChart');
    
    if (!categoryChartElement || !monthlyChartElement) {
      console.error('Chart elements not found in the DOM');
      return;
    }
    
    console.log('Rendering charts with summary data:', summary);
    
    // Prepare data for category chart
    const categoryLabels = summary.map(item => item._id || 'Uncategorized');
    const categoryData = summary.map(item => item.total);
    
    // Enhanced color palette for better visualization
    const categoryColors = [
      'rgba(54, 162, 235, 0.8)',   // Blue
      'rgba(255, 99, 132, 0.8)',   // Red
      'rgba(75, 192, 192, 0.8)',   // Teal
      'rgba(255, 206, 86, 0.8)',   // Yellow
      'rgba(153, 102, 255, 0.8)',  // Purple
      'rgba(255, 159, 64, 0.8)',   // Orange
      'rgba(40, 167, 69, 0.8)',    // Green
      'rgba(108, 117, 125, 0.8)'   // Gray
    ];
    
    // If we need more colors than in our set, generate them
    if (categoryLabels.length > categoryColors.length) {
      for (let i = categoryColors.length; i < categoryLabels.length; i++) {
        const r = Math.floor(Math.random() * 200);
        const g = Math.floor(Math.random() * 200);
        const b = Math.floor(Math.random() * 200);
        categoryColors.push(`rgba(${r}, ${g}, ${b}, 0.8)`);
      }
    }
    
    // Create or update category pie chart with improved styling
    const categoryCtx = categoryChartElement.getContext('2d');
    if (categoryChart) {
      categoryChart.destroy();
    }
    
    categoryChart = new Chart(categoryCtx, {
      type: 'doughnut',  // Changed to doughnut for better appearance
      data: {
        labels: categoryLabels,
        datasets: [{
          data: categoryData,
          backgroundColor: categoryColors,
          borderColor: 'white',
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverBackgroundColor: categoryColors.map(color => color.replace('0.8', '1')),
          hoverBorderColor: 'white'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          title: {
            display: true,
            text: 'Expenses by Category',
            font: {
              size: 16,
              weight: 'bold'
            },
            padding: {
              top: 10,
              bottom: 15
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                const percentage = Math.round((context.raw / total) * 100);
                const label = context.label || '';
                const value = context.formattedValue;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '60%',  // Doughnut hole size
        animation: {
          animateScale: true,
          animateRotate: true
        }
      }
    });
    
    // Prepare data for monthly chart (last 6 months)
    const monthlyData = prepareMonthlyData();
    
    // Create or update monthly bar chart with improved styling
    const monthlyCtx = monthlyChartElement.getContext('2d');
    if (monthlyChart) {
      monthlyChart.destroy();
    }
    
    monthlyChart = new Chart(monthlyCtx, {
      type: 'bar',
      data: {
        labels: monthlyData.labels,
        datasets: [{
          label: 'Monthly Expenses',
          data: monthlyData.data,
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          borderRadius: 6,
          hoverBackgroundColor: 'rgba(54, 162, 235, 0.9)',
          maxBarThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Monthly Expenses',
            font: {
              size: 16,
              weight: 'bold'
            },
            padding: {
              top: 10,
              bottom: 15
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `PKR ${context.formattedValue}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              display: true,
              drawBorder: false,
              color: 'rgba(200, 200, 200, 0.3)'
            },
            ticks: {
              callback: function(value) {
                if (value >= 1000) {
                  return 'PKR ' + value / 1000 + 'k';
                }
                return 'PKR ' + value;
              },
              padding: 10
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              padding: 10
            }
          }
        },
        animation: {
          duration: 1500,
          easing: 'easeOutQuart'
        }
      }
    });
  }
  
  // Prepare monthly data for chart
  function prepareMonthlyData() {
    // Get last 6 months
    const months = [];
    const data = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      months.push(monthYear);
      
      // Calculate total for this month
      const total = expenses.reduce((sum, expense) => {
        const expenseDate = new Date(expense.date);
        if (expenseDate.getMonth() === date.getMonth() && 
            expenseDate.getFullYear() === date.getFullYear()) {
          return sum + parseFloat(expense.amount);
        }
        return sum;
      }, 0);
      
      data.push(total);
    }
    
    return { labels: months, data };
  }
  
  // Show alert message with improved styling
  function showAlert(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show floating-alert`;
    alertDiv.setAttribute('role', 'alert');
    
    // Add appropriate icon based on alert type
    let icon = 'bi-info-circle';
    switch(type) {
      case 'success':
        icon = 'bi-check-circle';
        break;
      case 'danger':
        icon = 'bi-exclamation-circle';
        break;
      case 'warning':
        icon = 'bi-exclamation-triangle';
        break;
    }
    
    alertDiv.innerHTML = `
      <i class="bi ${icon} me-2"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to DOM
    document.body.appendChild(alertDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (alertDiv.parentNode) {
        // Add fade out animation
        alertDiv.classList.add('fade-out');
        setTimeout(() => {
          if (alertDiv.parentNode) {
            alertDiv.remove();
          }
        }, 300);
      }
    }, 5000);
  }
});