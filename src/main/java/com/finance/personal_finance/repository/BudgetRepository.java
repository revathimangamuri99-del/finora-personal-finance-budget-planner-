package com.finance.personal_finance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.finance.personal_finance.entity.Budget;

public interface BudgetRepository extends JpaRepository<Budget, Long> {

}