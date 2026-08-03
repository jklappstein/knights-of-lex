import { BootOrchestrator } from './boot/BootOrchestrator.js';

const orchestrator = new BootOrchestrator();
orchestrator.start('game-container');
