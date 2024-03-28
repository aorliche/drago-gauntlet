<?php
$files = scandir("levels");
$files = array_diff($files, array('.', '..'));
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="js/stage.js" type='module'></script>
    <script src="js/editor.js" type='module'></script>
    <script src="js/util.js" type='module'></script>
    <title>Editor</title>
    <link rel="stylesheet" href="../css/main.css">
</head>
<body>
    <div id="content">
        <div id="main">
            <canvas id="editor-canvas" width="600" height="600"></canvas>
        </div>
        <div id="palette">
            <div id='editor-pos'></div>
            <div class='palette-item'>Tree</div><br>
            <div class='palette-item selected'>Rocks</div><br>
            <div class='palette-item'>Water</div><br>
            <div class='palette-item'>Crate</div><br>
            <div class='palette-item'>Spider</div><br>
            <div class='palette-item'>Wizard</div><br>
            <div class='palette-item'>Health</div><br>
            <div class='palette-item'>Arrows</div><br>
            <div class='palette-item'>Fireballs</div><br>
            <div class='palette-item'>Key</div><br>
            <div class='palette-item'>Door</div><br>
            <div class='palette-item'>Player</div><br>
            <div class='palette-item'>Exit</div><br>
            <div class='palette-item'>Delete</div><br>
            <label for='name' class='lab1'>Name:</label>            
            <input type='text' id='name'>
            <button id='save'>Save</button><br>
            <label for='levels' class='lab1'>Level:</label>
            <select id="levels">
<?php foreach ($files as $file) { ?>
                    <option value="<?= $file ?>"><?= $file ?></option>
<?php } ?>
            </select>
            <button id='load'>Load</button>
        </div>
        <div id='right'>
            <canvas id="editor-minimap" width="200" height="200"></canvas>
        </div>
    </div>
</body>
</html>
