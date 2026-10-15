package com.finance.personal_finance.service;

import com.finance.personal_finance.entity.Transaction;
import com.finance.personal_finance.entity.User;
import com.finance.personal_finance.repository.TransactionRepository;
import com.finance.personal_finance.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;

    public TransactionService(
            TransactionRepository transactionRepository,
            UserRepository userRepository) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
    }

    public List<Transaction> getAllTransactions(Long userId) {
        return transactionRepository.findAllByUser_Id(userId);
    }

    public Transaction addTransaction(
            Transaction transaction, Long userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "User not found"));

        transaction.setId(null);
        transaction.setUser(user);

        return transactionRepository.save(transaction);
    }

    @Transactional
    public Transaction updateTransaction(
            Long id, Transaction updated, Long userId) {

        Transaction existing = transactionRepository
                .findByIdAndUser_Id(id, userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Transaction not found"));

        existing.setTitle(updated.getTitle());
        existing.setAmount(updated.getAmount());
        existing.setType(updated.getType());
        existing.setCategory(updated.getCategory());
        existing.setTransactionDate(updated.getTransactionDate());
        existing.setDescription(updated.getDescription());

        return transactionRepository.save(existing);
    }

    @Transactional
    public void deleteTransaction(Long id, Long userId) {

        Transaction existing = transactionRepository
                .findByIdAndUser_Id(id, userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Transaction not found"));

        transactionRepository.delete(existing);
    }
}