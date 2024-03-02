
import {$, $$} from './util.js';
import {Editor, Stage} from './stage.js';

window.addEventListener('load', () => {
    const canvas = $('#editor-canvas');
    const posSpan = $('#editor-pos');
    const stage = new Stage(canvas);
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
            editor.switchPlacing(item.dataset.name);
        });
    });
});
