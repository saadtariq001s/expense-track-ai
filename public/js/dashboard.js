// File: public/js/dashboard.js
document.addEventListener('DOMContentLoaded', function() {
  // Initialize variables
  let expenses = [];
  let categoryChart = null;
  let monthlyChart = null;
  
  // DOM elements
  const expenseForm = document.getElementById('expenseForm');
  const expensesTable = document.getElementById('expensesTable');
  const editExpenseModal = new bootstrap.Modal(document.getElementById('editExpenseModal'));
  const editExpenseForm = document.getElementById('editExpenseForm');
  const saveExpenseChanges = document.getElementById('saveExpenseChanges');
  
  // Fetch expenses and update UI
  fetchExpenses();
  
  // Also fetch insights
  fetchInsights();
  
  // Event listeners
  expenseForm.addEventListener('submit', handleAddExpense);
  expensesTable.addEventListener('click', handleTableActions);
  saveExpenseChanges.addEventListener('click', handleUpdateExpense);
  
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
      document.getElementById('spendingInsights').innerHTML = `
        <div class="alert alert-warning" role="alert">
          Could not load spending insights. Please try again later.
        </div>
      `;
    }
  }
  
  // Render insights section
  function renderInsights(insightsData) {
    const insightsContainer = document.getElementById('spendingInsights');
    
    if (!insightsData.insights || insightsData.insights.length === 0) {
      insightsContainer.innerHTML = `
        <div class="alert alert-info" role="alert">
          Add more expenses to see detailed spending insights!
        </div>
      `;
      return;
    }
    
    let insightsHtml = `
      <div class="row mb-3">
        <div class="col-md-4">
          <div class="card bg-light h-100">
            <div class="card-body text-center">
              <h6 class="card-title">Total Spent</h6>
              <p class="display-6">PKR ${parseFloat(insightsData.totalSpent).toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card bg-light h-100">
            <div class="card-body text-center">
              <h6 class="card-title">Top Category</h6>
              <p class="display-6">${insightsData.topCategory || 'N/A'}</p>
              <p class="text-muted">${insightsData.topCategoryPercentage || 0}% of total</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card bg-light h-100">
            <div class="card-body text-center">
              <h6 class="card-title">Avg. Transaction</h6>
              <p class="display-6">PKR ${insightsData.avgTransactionSize || 0}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="card mb-3">
        <div class="card-header">
          <h6 class="mb-0">Key Insights</h6>
        </div>
        <div class="card-body">
          <ul class="list-group list-group-flush">
    `;
    
    insightsData.insights.forEach(insight => {
      insightsHtml += `<li class="list-group-item">${insight}</li>`;
    });
    
    insightsHtml += `
          </ul>
        </div>
      </div>
    `;
    
    // Monthly trend indicator
    if (insightsData.monthOverMonthGrowth !== null) {
      const growthValue = parseFloat(insightsData.monthOverMonthGrowth);
      const isPositive = growthValue > 0;
      const icon = isPositive ? 'bi-arrow-up-circle-fill text-danger' : 'bi-arrow-down-circle-fill text-success';
      const trend = isPositive ? 'increase' : 'decrease';
      
      insightsHtml += `
        <div class="card">
          <div class="card-body d-flex align-items-center">
            <i class="bi ${icon} fs-1 me-3"></i>
            <div>
              <h6 class="card-title">Month-over-Month Trend</h6>
              <p class="card-text">
                Your spending shows a ${Math.abs(growthValue)}% ${trend} compared to last month.
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
      if (confirm('Are you sure you want to delete this expense?')) {
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
      const editModal = bootstrap.Modal.getInstance(document.getElementById('editExpenseModal'));
      editModal.hide();
      
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
  
  // Render expenses table
  function renderExpensesTable() {
    if (!expensesTable) {
      console.error('Expenses table element not found');
      return;
    }
    
    console.log('Rendering expenses table with', expenses.length, 'expenses');
    
    if (expenses.length === 0) {
      expensesTable.innerHTML = `
        <tr>
          <td colspan="5" class="text-center">No expenses found. Add your first expense!</td>
        </tr>
      `;
      return;
    }
    
    expensesTable.innerHTML = expenses.map(expense => `
      <tr data-id="${expense._id}">
        <td>${new Date(expense.date).toLocaleDateString()}</td>
        <td>${expense.description}</td>
        <td><span class="badge bg-info">${expense.category || 'Other'}</span></td>
        <td>${expense.currency || 'PKR'} ${parseFloat(expense.amount).toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary edit-btn"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger delete-btn"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
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
    const categoryColors = generateColors(categoryLabels.length);
    
    // Create or update category pie chart
    const categoryCtx = categoryChartElement.getContext('2d');
    if (categoryChart) {
      categoryChart.destroy();
    }
    
    categoryChart = new Chart(categoryCtx, {
      type: 'pie',
      data: {
        labels: categoryLabels,
        datasets: [{
          data: categoryData,
          backgroundColor: categoryColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Expenses by Category'
          }
        }
      }
    });
    
    // Prepare data for monthly chart (last 6 months)
    const monthlyData = prepareMonthlyData();
    
    // Create or update monthly bar chart
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
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Monthly Expenses'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return 'PKR ' + value;
              }
            }
          }
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
  
  // Generate colors for charts
  function generateColors(count) {
    const colorSet = [
      'rgba(255, 99, 132, 0.8)',
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 206, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 159, 64, 0.8)',
      'rgba(199, 199, 199, 0.8)',
      'rgba(83, 102, 255, 0.8)',
      'rgba(40, 159, 64, 0.8)',
      'rgba(210, 199, 199, 0.8)'
    ];
    
    // If we need more colors than in our set, generate them
    if (count > colorSet.length) {
      for (let i = colorSet.length; i < count; i++) {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        colorSet.push(`rgba(${r}, ${g}, ${b}, 0.8)`);
      }
    }
    
    return colorSet.slice(0, count);
  }
  
  // Show alert message
  function showAlert(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to DOM
    document.body.appendChild(alertDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
      alertDiv.remove();
    }, 5000);
  }
});