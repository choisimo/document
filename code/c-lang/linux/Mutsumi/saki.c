#include <stdio.h>
#include "Mutsumi.h"
#include <unistd.h>
#include <stdlib.h>
#include <string.h>
#include <sys/wait.h>

static const char* ALLOWED_ACTIONS[] = {
    "thinking...",
    "walking",
    "running",
    "sleeping",
    "reading"
};

static const size_t ALLOWED_ACTIONS_COUNT = sizeof(ALLOWED_ACTIONS) / sizeof(ALLOWED_ACTIONS[0]);

static int is_allowed_action(const char* action) {
    for (size_t i = 0; i < ALLOWED_ACTIONS_COUNT; i++) {
        if (strcmp(action, ALLOWED_ACTIONS[i]) == 0) {
            return 1;
        }
    }
    return 0;
}

void move(const char *name, const char* action) {
    if (name == NULL || action == NULL) {
        fprintf(stderr, "Error: name and action must not be null\n");
        return;
    }

    if (!is_allowed_action(action)) {
        fprintf(stderr, "Error: Action '%s' is not in the allowed list.\n", action);
        fprintf(stderr, "Allowed actions: ");
        for (size_t i = 0; i < ALLOWED_ACTIONS_COUNT; i++) {
            fprintf(stderr, "'%s'%s", ALLOWED_ACTIONS[i], 
                    (i < ALLOWED_ACTIONS_COUNT - 1) ? ", " : "\n");
        }
        return;
    }

    printf("Process [%d]: %s is %s\n", getpid(), name, action);
}

int main(void)
{
    char name[50];
    char action[100];

    printf("=== Fork/Exec Demo (Secure Version) ===\n");
    printf("This demo shows process forking without executing arbitrary commands.\n\n");

    printf("Enter name: ");
    if (scanf("%49s", name) != 1) {
        fprintf(stderr, "Error: Failed to read name\n");
        return 1;
    }

    printf("Enter action (thinking.../walking/running/sleeping/reading): ");
    if (scanf(" %99[^\n]", action) != 1) {
        fprintf(stderr, "Error: Failed to read action\n");
        return 1;
    }

    pid_t pid = fork();

    if (pid == -1) {
        perror("fork failed");
        return 1;
    } else if (pid == 0) {
        move(name, action);
        _exit(0);
    } else {
        move(name, "thinking...");
        int status;
        waitpid(pid, &status, 0);
        printf("Child process completed with status: %d\n", WEXITSTATUS(status));
    }

    return 0;
}