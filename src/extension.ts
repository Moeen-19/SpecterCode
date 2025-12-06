import * as vscode from 'vscode';
import { MirrorCanvasExtension } from './core/MirrorCanvasExtension';

let mirrorCanvas: MirrorCanvasExtension | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('MirrorCanvas extension is being activated');
    
    try {
        mirrorCanvas = new MirrorCanvasExtension(context);
        mirrorCanvas.activate();
        
        console.log('MirrorCanvas extension activated successfully');
    } catch (error) {
        console.error('Failed to activate MirrorCanvas extension:', error);
        vscode.window.showErrorMessage('Failed to activate MirrorCanvas: ' + (error as Error).message);
    }
}

export async function deactivate() {
    console.log('MirrorCanvas extension is being deactivated');
    
    if (mirrorCanvas) {
        await mirrorCanvas.deactivate();
        mirrorCanvas = undefined;
    }
    
    console.log('MirrorCanvas extension deactivated');
}