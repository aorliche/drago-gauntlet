<?php
$files = scandir("levels");
$files = array_diff($files, array('.', '..'));
$levels = array();
foreach ($files as $file) {
    if (preg_match('/^M\\d+\\.json$/', $file)) {
        array_push($levels, $file);
    }
}
natsort($levels);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="js/stage.js" type='module'></script>
    <script src="js/util.js" type='module'></script>
    <script src="js/game.js" type='module'></script>
    <title>DragoGauntlet</title>
    <link rel="stylesheet" href="../css/main.css">
    <link rel="stylesheet" href="../css/game.css">
	<link rel="icon" type="image/png" href="/images/Gopher.png">
</head>
<body>
    <h1>DragoGauntlet</h1>
    <div id="content">
        <div id="main">
            <canvas id="game-canvas" width="600" height="600"></canvas>
        </div>
        <div id="palette">
            <select id="levels">
<?php foreach ($levels as $level) { ?>
                    <option value="<?= $level ?>"><?= $level ?></option>
<?php } ?>
            </select>
        </div>
        <div id='right'>
			<canvas id="game-minimap" width="200" height="200"></canvas>
			<h2>Level <span id='level'>0</span></h2>
			<div id='time'>Time: 0:00</div>
			<div id='score'>Score: 0</div>
			<div id='health'><img src='/images/Health.png' height='20'></div>
			<table>
			<tr>
				<td><img src="images/Arrows.png"></td><td id='arrows'> - </td>
			</tr>
			<tr>
				<td><img src="images/Fireballs.png"></td><td id='fireballs'> - </td>
			</tr>
			<tr>
				<td><img src="images/Key.png"></td><td id='key'> - </td>
			</tr>
			</table><br>
			<h2 id='controls'>Controls</h2>
			<ul>
				<li><img src='images/Art/ControlsArrows.png' height='20'> <span>Move</span></li>
				<li><img src='images/Art/ControlsSpaceBar.png' height='20'> <span>Shoot</span></li>
				<li><img src='images/Art/ControlsAlt.png' height='20'> <span>Fireball</span></li>
			<ul>
        </div>
    </div>
</body>
</html>
