# Yet another Game of Life 🎆

Done as simple as possible.

🚀 Tested on up to 2000x2000: ≈1700ms per turn (MB Air m1, Safari);

🩼 Suports multithreading (offloading part of the calculations to worker threads), though in practice it only makes the app slower due to the overhead 🙄. Still makes the app more responsive inbetween turns.

📫 Eventbus class add a bit of reactivity via useSignal method.

⏯️ Controls are pretty much self-explanatory:

-   Clicking on a cell while game is stopped switches cell state
-   Width & height: number of cell in a row and in a column respectively
-   Worker threds: forementioned "multithreading". "0" means that all calculatins occur in the main thread
-   "Randomize" button clears the board and creates random number of living cells
-   "Clear" button just makes all of the cells "dead"
-   "Speed" slider changes delay between turns in range of 1000ms to 0ms (left to right). Note: ms per turn couter takes the delay into account which means that you are not getting real calculations time unless calculations takes longer than selected delay.
