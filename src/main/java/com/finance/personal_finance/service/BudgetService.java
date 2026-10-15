package com.finance.personal_finance.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.finance.personal_finance.entity.Budget;
import com.finance.personal_finance.repository.BudgetRepository;

@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;

    public BudgetService(BudgetRepository budgetRepository) {
        this.budgetRepository = budgetRepository;
    }

    public List<Budget> getAllBudgets() {
        return budgetRepository.findAll();
    }

    public Budget getBudgetById(Long id) {
        return budgetRepository.findById(id)
                .orElseThrow(() ->
                    new RuntimeException("Budget not found with ID: " + id));
    }

    public Budget createBudget(Budget budget) {
        return budgetRepository.save(budget);
    }

    public Budget updateBudget(Long id, Budget updatedBudget) {
        Budget existingBudget = getBudgetById(id);

        existingBudget.setCategory(updatedBudget.getCategory());
        existingBudget.setAmount(updatedBudget.getAmount());
        existingBudget.setBudgetMonth(updatedBudget.getBudgetMonth());

        return budgetRepository.save(existingBudget);
    }

    public void deleteBudget(Long id) {
        Budget budget = getBudgetById(id);
        budgetRepository.delete(budget);
    }
}