
import {$, $$} from './util.js';
import {Editor, Stage} from './stage.js';

window.addEventListener('load', () => {
    const canvas = $('#editor-canvas');
    const miniMap = $('#editor-minimap');
    const posSpan = $('#editor-pos');
    const stage = new Stage(canvas, miniMap);
    const editor = new Editor({stage, posSpan});
    editor.draw();

    document.addEventListener('keydown', (e) => {
        editor.keydown(e);
    });

    canvas.addEventListener('mousemove', (e) => {
        editor.mousemove(e);
    });
    
    canvas.addEventListener('mousedown', (e) => {
        editor.mousedown(e);
    });
    
    canvas.addEventListener('mouseup', (e) => {
        editor.mouseup(e);
    });

    canvas.addEventListener('mouseout', (e) => {
        editor.mouseout(e);
    });

    canvas.addEventListener('mouseenter', (e) => {
        editor.mouseenter(e);
    });

    const items = $$('.palette-item');
    items.forEach((item) => {
        item.addEventListener('click', (e) => {
            items.forEach((i) => {
                i.classList.remove('selected');
            });
            item.classList.add('selected');
            editor.switchPlacing(item.innerText);
        });
    });

    $('#save').addEventListener('click', () => {
        const name = $('#name').value;
        if (!name) {
            alert('Please enter a name');
            return;
        }
        const json = stage.save(name);
        fetch('save.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: json
        })
        .then(res => res.text())
        .then(data => {
            alert(data);
            if (data === 'Success') {
                const opt = document.createElement('option');
                opt.value = name + '.json';
                opt.innerText = opt.value;
                $('#levels').appendChild(opt);
            }
        });
    });

    $('#load').addEventListener('click', () => {
        const lvl = $('#levels').value;
        fetch(`levels/${lvl}`)
        .then(res => res.json())
        .then(data => {
            stage.load(data);
            editor.draw();
        });
    });
});
