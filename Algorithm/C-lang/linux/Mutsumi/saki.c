#include <stdio.h>
#include <Mutsumi.h>
#include <unistd.h>
#include <stdlib.h>
#define TogawaSakiko saki

void move(const char *name, void* action){
  if (name != NULL && action != NULL) {
    printf("process ID [%d]: %s is %s!\n", getpid(), name, (char*)action);

    char *cmd[] = {"/bin/bash", "-c", (char*)action, NULL};
    execvp(cmd[0], cmd);

    perror("execvp failed\n");
    exit(1);
  } else {
    printf("process ID [%d]: Please specify both name and an action\n", getpid());
  }
}

int main()
{
  char name[50];
  char action[100];

  printf("Enter name: ");
  scanf("%49s", name);
  printf("Enter action: ");
  scanf(" %[^\n]", action);

  pid_t pid = fork();

  if (pid == -1) {
    perror("fork failed\n");
    exit(1);
  } else if (pid == 0) {
    move(name, (void*)action);
  } else {
    move(name, (void*)"thinking...");
  }

  return 0;
}