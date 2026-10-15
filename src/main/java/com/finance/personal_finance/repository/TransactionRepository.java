package com.finance.personal_finance.repository;

import com.finance.personal_finance.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository
        extends JpaRepository<Transaction, Long> {

    List<Transaction> findAllByUser_Id(Long userId);

    Optional<Transaction> findByIdAndUser_Id(
            Long id, Long userId);
}