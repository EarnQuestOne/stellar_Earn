# Bounds Checking Developer Guide

## Quick Reference for Safe Array Access in Soroban Contracts

---

## ❌ Don't Do This

```rust
// UNSAFE - Can panic if index is out of bounds
let item = vec.get(i).unwrap();
```

---

## ✅ Do This Instead

### Pattern 1: Critical Operations (Fail-Fast)
Use when the operation must succeed or the transaction should fail:

```rust
// Returns Error::IndexOutOfBounds if index is invalid
let item = vec.get(i).ok_or(Error::IndexOutOfBounds)?;
```

**Use cases:**
- Batch operations
- Data validation
- Required data processing
- State modifications

**Example:**
```rust
pub fn process_batch(items: &Vec<Item>) -> Result<(), Error> {
    for i in 0..items.len() {
        let item = items.get(i).ok_or(Error::IndexOutOfBounds)?;
        // Process item...
    }
    Ok(())
}
```

---

### Pattern 2: Query Operations (Graceful Skip)
Use when missing items can be safely skipped:

```rust
// Safely skips if index is invalid
if let Some(item) = vec.get(i) {
    // Process item...
}
```

**Use cases:**
- Query functions
- Filtering operations
- Optional data retrieval
- Read-only operations

**Example:**
```rust
pub fn get_filtered_items(ids: &Vec<Symbol>) -> Vec<Item> {
    let mut results = Vec::new(env);
    
    for i in 0..ids.len() {
        if let Some(id) = ids.get(i) {
            if let Ok(item) = storage::get_item(env, &id) {
                results.push_back(item);
            }
        }
    }
    
    results
}
```

---

## Common Scenarios

### Scenario 1: Iterating Over a Vector

```rust
// ❌ UNSAFE
for i in 0..vec.len() {
    let item = vec.get(i).unwrap();
    process(item);
}

// ✅ SAFE (Critical)
for i in 0..vec.len() {
    let item = vec.get(i).ok_or(Error::IndexOutOfBounds)?;
    process(item)?;
}

// ✅ SAFE (Query)
for i in 0..vec.len() {
    if let Some(item) = vec.get(i) {
        process(item);
    }
}

// ✅ BEST (No indexing needed)
for item in vec.iter() {
    process(item);
}
```

---

### Scenario 2: Accessing Specific Index

```rust
// ❌ UNSAFE
let first = vec.get(0).unwrap();

// ✅ SAFE
let first = vec.get(0).ok_or(Error::IndexOutOfBounds)?;

// ✅ ALTERNATIVE (for first/last)
let first = vec.first_opt().ok_or(Error::IndexOutOfBounds)?;
```

---

### Scenario 3: Nested Vector Access

```rust
// ❌ UNSAFE
let tag = metadata.tags.get(i).unwrap();

// ✅ SAFE
let tag = metadata.tags.get(i).ok_or(Error::IndexOutOfBounds)?;
validate_tag(&tag)?;
```

---

## Error Handling

### Define the Error Type

```rust
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    // ... other errors
    IndexOutOfBounds = 90,
}
```

### Use in Functions

```rust
pub fn safe_function(items: &Vec<Item>) -> Result<(), Error> {
    for i in 0..items.len() {
        let item = items.get(i).ok_or(Error::IndexOutOfBounds)?;
        // Process item
    }
    Ok(())
}
```

---

## Testing Bounds Checking

### Test Valid Bounds

```rust
#[test]
fn test_valid_bounds() {
    let env = Env::default();
    let mut vec = Vec::new(&env);
    vec.push_back(1);
    vec.push_back(2);
    
    // Should succeed
    let item = vec.get(0).ok_or(Error::IndexOutOfBounds);
    assert!(item.is_ok());
}
```

### Test Invalid Bounds

```rust
#[test]
fn test_invalid_bounds() {
    let env = Env::default();
    let vec = Vec::new(&env);
    
    // Should return error, not panic
    let item = vec.get(0).ok_or(Error::IndexOutOfBounds);
    assert!(item.is_err());
}
```

### Test Edge Cases

```rust
#[test]
fn test_edge_cases() {
    let env = Env::default();
    
    // Empty vector
    let empty = Vec::new(&env);
    assert!(empty.get(0).is_none());
    
    // Large offset
    let mut vec = Vec::new(&env);
    vec.push_back(1);
    assert!(vec.get(100).is_none());
}
```

---

## Performance Considerations

### Bounds Checking is Cheap
- `.get()` already performs bounds checking internally
- `.ok_or()` adds minimal overhead
- Much cheaper than recovering from a panic

### Optimization Tips

1. **Cache vector length:**
   ```rust
   let len = vec.len();
   for i in 0..len {
       if let Some(item) = vec.get(i) {
           // Process
       }
   }
   ```

2. **Use iterators when possible:**
   ```rust
   // Better than indexing
   for item in vec.iter() {
       process(item);
   }
   ```

3. **Batch bounds checks:**
   ```rust
   // Check all indices first
   for i in 0..len {
       items.get(i).ok_or(Error::IndexOutOfBounds)?;
   }
   // Then process
   for i in 0..len {
       let item = items.get(i).unwrap(); // Safe now
       process(item);
   }
   ```

---

## Checklist for Code Review

- [ ] No `.unwrap()` calls on `.get()` operations
- [ ] All array accesses use `.ok_or()` or `if let Some()`
- [ ] Appropriate pattern chosen (fail-fast vs graceful skip)
- [ ] Error type defined and documented
- [ ] Tests cover valid bounds
- [ ] Tests cover invalid bounds
- [ ] Tests cover edge cases (empty, single item, large offset)

---

## Real-World Examples from This Codebase

### Example 1: Batch Quest Registration
```rust
pub fn register_quests_batch(
    env: &Env,
    creator: &Address,
    quests: &Vec<BatchQuestInput>,
) -> Result<(), Error> {
    let len = quests.len();
    validation::validate_batch_quest_size(len)?;

    for i in 0u32..len {
        // ✅ Safe bounds checking
        let q = quests.get(i).ok_or(Error::IndexOutOfBounds)?;
        register_quest(env, &q.id, creator, &q.reward_asset, 
                      q.reward_amount, &q.verifier, q.deadline)?;
    }

    Ok(())
}
```

### Example 2: Query by Status
```rust
pub fn get_quests_by_status(
    env: &Env,
    status: &QuestStatus,
    offset: u32,
    limit: u32,
) -> Vec<Quest> {
    let ids = storage::get_quest_ids(env);
    let mut results = Vec::new(env);

    for i in 0..ids.len() {
        // ✅ Safe bounds checking with graceful skip
        if let Some(id) = ids.get(i) {
            if let Ok(quest) = storage::get_quest(env, &id) {
                if &quest.status == status {
                    results.push_back(quest);
                }
            }
        }
    }

    results
}
```

---

## Additional Resources

- [Soroban SDK Documentation](https://docs.rs/soroban-sdk/)
- [Rust Error Handling](https://doc.rust-lang.org/book/ch09-00-error-handling.html)
- [Option and Result Types](https://doc.rust-lang.org/std/option/)

---

## Questions?

If you're unsure which pattern to use:
1. **Will missing data break the operation?** → Use `.ok_or()`
2. **Can missing data be safely skipped?** → Use `if let Some()`
3. **Can you avoid indexing entirely?** → Use iterators

**When in doubt, use `.ok_or()` for safety.**

---

*Last updated: April 25, 2026*  
*Part of the Array Bounds Checking Security Fix*
