package com.finance.personal_finance.controller;

import com.finance.personal_finance.entity.Transaction;
import com.finance.personal_finance.service.TransactionService;

import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(
            TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    private Long getLoggedInUserId(HttpSession session) {
        Object userId = session.getAttribute("userId");

        if (userId == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Please log in first");
        }

        return ((Number) userId).longValue();
    }

    @GetMapping
    public List<Transaction> getAllTransactions(
            HttpSession session) {

        Long userId = getLoggedInUserId(session);
        return transactionService.getAllTransactions(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Transaction addTransaction(
            @RequestBody Transaction transaction,
            HttpSession session) {

        Long userId = getLoggedInUserId(session);

        return transactionService.addTransaction(
                transaction, userId);
    }

    @PutMapping("/{id}")
    public Transaction updateTransaction(
            @PathVariable Long id,
            @RequestBody Transaction transaction,
            HttpSession session) {

        Long userId = getLoggedInUserId(session);

        return transactionService.updateTransaction(
                id, transaction, userId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(
            @PathVariable Long id,
            HttpSession session) {

        Long userId = getLoggedInUserId(session);

        transactionService.deleteTransaction(id, userId);

        return ResponseEntity.noContent().build();
    }
}