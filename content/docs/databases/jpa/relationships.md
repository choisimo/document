# JPA Entity Relationships

> Complete guide to JPA/Hibernate entity relationship mappings

---

## Relationship Types

```mermaid
graph LR
    A[Entity A] -->|@ManyToOne| B[Entity B]
    B -->|@OneToMany| A
    C[Entity C] -->|@OneToOne| D[Entity D]
    E[Entity E] -->|@ManyToMany| F[Entity F]
```

---

## Unidirectional Relationships

### N:1 (Many-to-One)

The most common relationship type where many entities reference one entity.

```java
@Entity
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String content;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;
}
```

### N:1 with Non-Primary Key Reference

When the foreign key references a non-primary key column:

```java
@Entity
public class OrderDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "product_code",           // Current entity column
        referencedColumnName = "code",    // Target entity column (non-PK)
        insertable = false,
        updatable = false
    )
    private Product product;
}
```

---

## Bidirectional Relationships

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Owner Side** | The side that manages the relationship (has the foreign key) |
| **Inverse Side** | The non-owning side (uses `mappedBy`) |
| **mappedBy** | Indicates this is the inverse side, points to the owner field |

> **Important:** The inverse side (with `mappedBy`) is read-only for relationship management.

### Bidirectional N:1 / 1:N

```java
// Owner Side (Many)
@Entity
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private Post post;
    
    // Helper method for bidirectional sync
    public void setPost(Post post) {
        this.post = post;
        if (post != null && !post.getComments().contains(this)) {
            post.getComments().add(this);
        }
    }
}

// Inverse Side (One)
@Entity
public class Post {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Comment> comments = new ArrayList<>();
    
    // Helper method for bidirectional sync
    public void addComment(Comment comment) {
        comments.add(comment);
        comment.setPost(this);
    }
    
    public void removeComment(Comment comment) {
        comments.remove(comment);
        comment.setPost(null);
    }
}
```

### Bidirectional 1:1 (One-to-One)

```java
// Owner Side
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "profile_id", referencedColumnName = "id")
    private Profile profile;
}

// Inverse Side
@Entity
public class Profile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne(mappedBy = "profile")
    private User user;
}
```

### M:N (Many-to-Many)

```java
// Owner Side
@Entity
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToMany
    @JoinTable(
        name = "student_course",
        joinColumns = @JoinColumn(name = "student_id"),
        inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    private Set<Course> courses = new HashSet<>();
}

// Inverse Side
@Entity
public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToMany(mappedBy = "courses")
    private Set<Student> students = new HashSet<>();
}
```

---

## Fetch Types

| Type | Description | Use Case |
|------|-------------|----------|
| `LAZY` | Load on access | Default for collections |
| `EAGER` | Load immediately | Default for single entities |

> **Best Practice:** Always use `FetchType.LAZY` and fetch explicitly when needed.

---

## Cascade Types

| Type | Description |
|------|-------------|
| `PERSIST` | Cascade persist operations |
| `MERGE` | Cascade merge operations |
| `REMOVE` | Cascade remove operations |
| `REFRESH` | Cascade refresh operations |
| `DETACH` | Cascade detach operations |
| `ALL` | All of the above |

---

## Common Pitfalls

### N+1 Problem

```java
// Bad: Causes N+1 queries
List<Post> posts = postRepository.findAll();
for (Post post : posts) {
    post.getComments().size(); // Each triggers a query
}

// Good: Use JOIN FETCH
@Query("SELECT p FROM Post p JOIN FETCH p.comments")
List<Post> findAllWithComments();
```

### Infinite Recursion in JSON

```java
// Solution 1: @JsonIgnore on one side
@OneToMany(mappedBy = "post")
@JsonIgnore
private List<Comment> comments;

// Solution 2: @JsonManagedReference / @JsonBackReference
// Parent
@OneToMany(mappedBy = "post")
@JsonManagedReference
private List<Comment> comments;

// Child
@ManyToOne
@JsonBackReference
private Post post;
```

---

## Related Documentation

- [JPA Overview](overview.md)
- [QueryDSL Guide](querydsl.md)
- [Entity Lifecycle](lifecycle.md)
