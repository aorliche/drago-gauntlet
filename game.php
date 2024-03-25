<?php
$files = scandir("levels");
$files = array_diff($files, array('.', '..'));
$levels = array();
foreach ($files as $file) {
    if (preg_match('/^L\\d+\\.json$/', $file)) {
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
        </div>
    </div>
</body>
</html>
