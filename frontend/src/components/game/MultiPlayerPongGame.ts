interface MultiplayerBall {
    x: number;
    y: number;
    dx: number;
    dy: number;
    radius: number;
}

interface MultiplayerPaddle {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    playerId: number;
    keys: {up: string; down: string};
}

interface MultiplayerScore {
    player1: number;
    player2: number;
    player3: number;
    player4: number;
}
