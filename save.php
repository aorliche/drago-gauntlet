<?php
$new = file_get_contents('php://input');
$level = json_decode($new);
$name = $level->name;

if (str_contains($name, '/') || str_contains($name, '\\') || str_contains($name, '.')) {
    echo "Invalid name";
    return;
}

file_put_contents('levels/'. $name .'.json', $new);

echo "Success";
?>
