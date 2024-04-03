# CalculatorOS

I want to implement an operating system in the Desmos graphing calculator. It will feature disk and memory allocation, processes, threading (likely implemented as child processes), interacting with hardware devices (terminal, keyboard, possibly internet), and environment variables. It will also allow running a program on start up, routing that program's standard input and output to the terminal and keyboard, and allowing it to access the inputs and outputs of its child processes as buffers. Programs will either be native (in which case they are given a virtual file in the immutable “/bin” directory), or are text-based with a shebang specifying the program responsible for running them (in which case they are stored in the “/usr/bin” directory, which is mutable). The default shell program (which will be native) will function similar to the bash shell, as much as is reasonably possible.

# Language Considerations

The biggest thing that needs to be implemented at the language layer is the ability to create functions that consist of multiple different states. For example, every time a function has a while loop, or calls another function, or early returns, it needs to have a different state attached to it, that it can then use to resume execution. Essentially, functions will take a state in and mutate it, and by repeatedly applying functions to a state, they will either exit (with a value) or continue to run. I think the easiest way to do this is to create a table of different states and break out a stateful function into separate non-stateful ones that represent each part of the state. The table will simply hold a number for each different state available in the entire program, and will be used to compile these sub-functions so that they advance to the correct state. Finally, there will need to be a global function that takes in a state number, as well as the current state, and uses that to evaluate the correct sub-function and return its result.

The state itself can be stored as a list representing a stack. The first element in the list will consist of a stack frame pointer, which points to the index in the list where the beginning of the last stack frame is. The next element is the current state number, which represents which sub-function to run. The beginning of a stack frame consists of a return state number, which is the state number of the sub-function that will be ran once the current sub-function returns.

Because sub-functions are the only ones responsible for actually mutating the state, they are what decides whether they return or not. This means that a while loop can be implemented as simply not mutating the state, a for loop can be done by only incrementing the counter variables, a return can be done by removing the stack frame from the state, and a function call can be done by adding one.

Functions don't return values, and they only take in references. This means that in order to return a value, a function must modify one of its arguments. This is done to simplify the process of returning values, since it adds extra complexity to the implementation. Arguments are added to the stack after the return pointer in the order in which they are listed. They each consist of stack pointers to their corresponding values. The language will not hide this implementation detail, so the arguments of a function are the pointers themselves; in order to actually retrieve a value, you must use the pointer as an index to the “stack” variable.

The language will implement while loops (as well as for loops, as simply a sugared form of while loops), early returns, and function calls. The function will be split at each of the aforementioned points, as follows. First, each split point will be assigned a state number (the first one will be the state number used to call the function itself). Then, they will only run if that state number matches the one that's currently being called (importantly, this will not be the state number coming from the state, but rather an a magic variable). Then, a version will be created for each of these state numbers, with as many versions as there are state numbers. Each version will have the magic state number variable set to a different state number, such that when the versions are compiled, they parts of them that aren't part of the current state will be simplified away.

The default behavior for a function will be to advance to the next state. If there is no next state to advance to, then they will return (i.e., strip it stack frame off the stack and return that new stack). Early returns are implemented exactly the same way regular returns are implemented, except behind an if statement. While loops are implemented by simply grabbing the entire loop and putting it into a sub-function. Once their condition is false, they advance to the next state, otherwise they simply return the same stack (although there likely will be some modifications made during the loop by the user's code, which will be returned as the new stack). Nested loops and early returns are implemented by advancing to their states instead of the while loop's state. Once those inner states are finished executing, they will advance back to the while loop's state, allowing it to continue looping.

It will also support the syntax “stack[pointer] = ...”, although this will be desugared to modifying the stack variable with an array map. Variables are implemented by exposing a “stackvar” keyword, which creates a new constant with a value that points to the next available spot on the stack. These variables are block-scoped, so when they go out of scope, a new stackvar can take the place of an older one. Just like arguments, these are simply indices of the “stack” array, and should be used as such. Also, freed memory won't necessarily be cleared, so it should be done by the user on variable initialization.

# Templates

## Block Storage

Desmos lists are capped at 10,000 elements, which is fine for a stack, but not for memory or disk storage. There needs to be code that abstracts away this issue, allowing storing and extracting bytes from a number, and using these to create byte arrays (with more than 10,000 elements). Also, multiple lists need to be able to be joined together, with a function automatically accessing the correct one. The hardest part of this implementation will be figuring out how to store bytes inside of a number, but due to it being abstracted away, the implementation itself will not have a large impact on the rest of the design, so it will not be explored here.

There also need to be templates to write data into block storage. These will be done at constant time, for the purposes of populating the disk with some initial data.

## Strings

Logimat templates have support for strings, so there needs to be some way to convert a string into a list, both for use with the aforementioned templates, as well as for use at runtime. This should be fairly trivial: just convert a string to a character array and convert that array to JSON.

# Kernel

The main kernel does not have a stack, as it just consists of a loop. It does, however, have a data list, which is used for multiple things. The data list has the following structure:

* 0 — State. If this is 0, then the system is in normal operation. If it is 1, then the system is preparing for a shutdown.

* 1 — Time. This is simply the number of seconds since the kernel started.

* 2 — Shutdown Time. If the state is 1, this will be the time in which the state was set to 1.

## Main Loop

The kernel will boot up by initializing its main loop, which as much as possible and does the following things (in the order listed):

• Records the time elapsed to a clock variable.

• Determines whether to run a process or a driver randomly. Then, determines which driver/process to run randomly. Once the item to run is decided, its next execution step is executed.

• Once the driver/process is ran, its stack should be mutated. If there is a syscall, it will be cleared.

• If the returned stack does have a syscall, then that syscall will be ran. Syscalls are simple, and do not require a stack. They may update multiple pieces of data, however. Because of the way Desmos works, each different piece of data updated will require re-running the execution step of the above driver/process.

## System Call Interface

A process can perform a system call by setting the first number in its allocated syscall space to the system call number. Each number represents a different system call. A system call requires data to be written to the empty space designated for syscalls. Below is a list of the different syscalls, and the data they require.

• 1 — Exit. Ignores the stack number. Requires an exit code in the first byte, which will be given to the parent process (if it exists).

• 2 — Shutdown. Puts the system into shutdown mode, sending a SIGEND to all processes. After 2 seconds (arbitrary), sends a SIGKILL, then tells the power simulator to shut the system down.

• 3 — Reboot. Tells the power simulator to reboot after a shutdown. Puts the system into shutdown mode.

• 4 — Print. The first number (bytes encoded into a float) will be printed to the terminal. Additional numbers will be ignored.

• 5 — Memory Alloc. The first number should be the length (in bytes) to allocate, and the next should be the stack pointer. If the allocation is successful, then the stack pointer will be set to the memory index of that allocation. Otherwise, the pointer will be set to 0.

• 6 — Memory Write. The first number should be the memory index. The second should be the byte which will be written to that memory address.

• (virtual) Memory Read.

• 8 — Memory Clear. The first number should be the memory index. This will clear the allocated memory at that index, allowing it to be re-used.

• 9 — File Write. The first number should be the length of the file name (in bytes). Subsequent bytes will be the file's name. The next number will be the byte index to write to. Finally, the next number will be the byte to write into the file. This will write the data to a file (creating it if it doesn't exist, and re-allocating it if it exceeds the file's allocation).

• (virtual) File Read.

• 11 — File Delete. The first number should be the length of the file name (in bytes). Subsequent bytes will be the file's name. If the file exists, it will be deleted.

• (virtual) Cur Process ID.

• (virtual) Process Argument.

• (virtual) Read stdin.

• (virtual) Read stdout.

• 16 — Write stdin. The first number should be the process index. The second should be the byte to write. That byte will be added to the end of the process' stdin.

• 17 — Start process. The first number should be the length (in bytes) of the process' location (as an absolute path), and the subsequent ones will be the the bytes containing that path. The number after this will be a stack pointer. If the process is executed successfully (its file exists), the the new process ID will be placed into the stack pointer. Otherwise, the stack pointer will read -1.

Syscalls are implemented as actions that update certain pieces of data depending on whether the syscall is requested. This means that the code for syscalls will be spread across multiple different actions.

## Processes

Each process will be stored in five lists that are constructed at compile time. The first list will be data about the process (specifically, whether it's alive, its parent process and its arguments), and the second will be the process' stack. All processes are native code, although they may be executing non-native code. The other two lists are the stdin and stdout. The last list is a list of parent processes. If any of these processes are killed, then this one will be as well — similarly, if any of these processes receive signals, so will this one.

Process IDs are unique per-process and are not recycled. There will be a list containing each process ID, and the index of that process ID corresponds to the index of the list containing the process data. There will also be another variable holding the next process ID.

## Drivers

Drivers are essentially the same thing as processes, although users cannot interact with them. They are responsible for interacting with virtual hardware devices (such as the keyboard and terminal). They are primarily responsible for reading from them (or doing some other sort of complicated management), as writing can be handled as a syscall. The keyboard driver will write into the first process's stdin, and the terminal driver will read from the first process' stdout and place it into the terminal.

## Disk Storage

The kernel will store data in the disk by using a map for files. The map is an array consisting of repeated sections of a length number (specifying number of bytes), bytes for the count of the aforementioned length, followed by a 0 (file) or 1 (directory), followed by a size number (representing number of blocks) and a list of blocks. Each block is (floor(total bytes / 10,000)) bytes long. There will also be an identical list of unallocated blocks, which are used to find new blocks to store the file in.

## Memory

Memory is implemented nearly identically to disk storage, except the first list has indices instead of names and length, and there is a variable used to specify the next index. Indices are not recycled, and will grow forever.

## Interrupts

Interrupts are handled by a process registering an interrupt handler. Because processes are all native code, this is simple. The interrupt handler is ran as though it's simply a function call. In other words, its stack frame is added to the end of the stack, and it is instructed to return to the previous state after it returns.

## Threads

Threads are implemented as sub-processes with the same stack frames as their parents. They are treated as a normal process, although when their parent exits, they do as well.

## Child Processes

Child processes work by having a list of parents. Any signals sent to the parents will also be sent to the child process, and if the parent is forcefully killed, the child will be as well. Similarly, if the parent exits, then the child will receive a SIGKILL.

## Process Lifecycle

A special type of process will be created when a process needs to exit. This functions similar to a normal driver/process in the kernel loop, although it doesn't have the same information as a process does: rather, it only has a stack and functions more like a driver. This process killer will send a SIGEND to a process, wait 2 seconds (or until the process exits), send a SIGKILL to it, waits 1 second (or until the process exits), then forcefully kills it. The process killer is part of the kernel, so it directly interacts with the lists that store processes and clears them in order to end the process.

# Programs

Programs are registered with the kernel and tie into native code. As mentioned, they all appear in the “/bin” directory as virtual files, and are executed as stateful functions. If there are no more processes available, then the program will not be started.

## shell

The shell program is the first process, and provides a bash-like interface. It will support redirecting standard output, terminal history, and background processes. It may (or may not) support running sh files. The shell will manage environment variables and place them into the “/tmp/env” file.

## ls

ls does what its name implies. It may not have all of the options built-in to the Linux version, but it will at least support ls -al.

## mkdir

Again, this one is simple. It likely won't support any options.

## touch

Same as above, no options.

## echo

Same as above, no options.

## cat

Same as above, no options.

## ps

Possibly with options (aux), possibly without. At the very least, it will list out process IDs and names.

## kill

This should support kill and kill -9.

## rm

This will remove files and directories. It may support recursion.

## help

This will list out every command.