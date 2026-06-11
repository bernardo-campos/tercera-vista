document.addEventListener('DOMContentLoaded', async function() {
    // --- Configuration & State ---
    const STORAGE_KEY = 'figureLock_progress';
    let validFigures = []; // Stores objects: { id: index, pathString: "1-2-3" }
    let unlockedIndices = new Set();
    
    // --- DOM Elements ---
    const grid = document.getElementById('figureGrid');
    const canvas = document.getElementById('lineCanvas');
    const ctx = canvas.getContext('2d');
    let roughCanvas = window.rough ? rough.canvas(canvas) : null;
    const messageArea = document.getElementById('messageArea');
    const figureListEl = document.getElementById('figureList');
    const progressCountEl = document.getElementById('progressCount');
    const resetBtn = document.getElementById('resetBtn');

    // --- Drawing State ---
    let points = [];
    let selectedPoints = [];
    let isDrawing = false;
    canvas.width = grid.offsetWidth;
    canvas.height = grid.offsetHeight;

    // --- Initialization ---
    initGrid();
    await loadFigures();
    loadProgress();
    renderList();
    window.addEventListener('rough-ready', syncRoughRenderer);
    window.addEventListener('load', syncRoughRenderer);

    // --- Event Listeners ---
    grid.addEventListener('mousedown', startDrawing);
    grid.addEventListener('mousemove', draw);
    grid.addEventListener('mouseup', stopDrawing);
    
    // Touch support
    grid.addEventListener('touchstart', (e) => startDrawing(e));
    grid.addEventListener('touchmove', (e) => draw(e));
    grid.addEventListener('touchend', (e) => stopDrawing(e));

    resetBtn.addEventListener('click', resetProgress);
    window.addEventListener('resize', () => {
        canvas.width = grid.offsetWidth;
        canvas.height = grid.offsetHeight;
        initGrid(); // Recalcular las posiciones de los puntos
    });

    // --- Data Loading ---
    async function loadFigures() {
        try {
            const response = await fetch('js/patrones.json');
            const data = await response.json();
            
            // Transformar segmentos JSON [[[1,2],[2,6]], ...] en conjuntos de bordes para validación flexible
            validFigures = data.map((segments, index) => {
                if (!segments || segments.length === 0) return null;
                
                const edgeSet = new Set();
                let pathDisplay = [segments[0][0]];

                segments.forEach(seg => {
                    const p1 = seg[0];
                    const p2 = seg[1];
                    
                    // Normalizar borde (orden independiente): más pequeño-más grande
                    const edgeKey = p1 < p2 ? `${p1}-${p2}` : `${p2}-${p1}`;
                    edgeSet.add(edgeKey);
                    
                    pathDisplay.push(seg[1]);
                });

                return {
                    id: index,
                    pathString: pathDisplay.join('-'), // For display only
                    edgeSet: edgeSet,
                    segments: segments
                };
            }).filter(p => p !== null);

            updateProgressDisplay();
        } catch (error) {
            console.error("Error loading figures:", error);
            messageArea.textContent = "Error loading figures data.";
        }
    }

    function loadProgress() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            unlockedIndices = new Set(JSON.parse(saved));
        }
    }

    function saveProgress() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlockedIndices]));
        updateProgressDisplay();
    }

    function syncRoughRenderer() {
        if (!window.rough || roughCanvas) return;

        roughCanvas = rough.canvas(canvas);
        renderList();
        if (solutionsModal.style.display === 'block') {
            renderAllSolutions();
        }
    }

    // --- Grid Logic ---
    function initGrid() {
        grid.innerHTML = '';
        grid.appendChild(canvas);
        points = [];
        
        const padding = 40;
        for (let i = 0; i < 9; i++) {
            const row = Math.floor(i / 3);
            const col = i % 3;
            
            const x = padding + (col * (canvas.width - 2 * padding) / 2);
            const y = padding + (row * (canvas.height - 2 * padding) / 2);
            
            const pointEl = document.createElement('div');
            pointEl.className = 'point';
            pointEl.style.left = `${x}px`;
            pointEl.style.top = `${y}px`;
            
            points.push({ id: i + 1, x, y, element: pointEl });
            grid.appendChild(pointEl);
        }
    }

    // --- Drawing Handlers ---
    function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        selectedPoints = [];
        points.forEach(p => p.element.classList.remove('active'));
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        handleInput(e);
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const { x, y } = getEventPos(e);
        handleInput(e);
        renderLine(x, y);
    }

    function stopDrawing(e) {
        if (!isDrawing) return;
        isDrawing = false;
        renderLine();
        validateFigure();
        
        // Restablecer el estado visual después de un retraso
        setTimeout(() => {
            selectedPoints = [];
            points.forEach(p => p.element.classList.remove('active'));
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }, 500);
    }

    function handleInput(e) {
        const { x, y } = getEventPos(e);
        const rect = grid.getBoundingClientRect();
        const relX = x - rect.left;
        const relY = y - rect.top;

        // Verificar proximidad a los puntos
        points.forEach(p => {
            const dist = Math.hypot(p.x - relX, p.y - relY);
            
            // Verificar si el punto está lo suficientemente cerca y NO es el punto inmediatamente anterior
            // Esto permite ciclos (por ejemplo, 1-2-1 o 1-2-3-1) pero evita la duplicación rápida del mismo punto mientras se pasa el cursor
            const lastPoint = selectedPoints[selectedPoints.length - 1];

            if (dist < 30 && p !== lastPoint) {
                // Verificar el punto intermedio (por ejemplo, 1 -> 3 requiere 2)
                if (lastPoint) {
                    const row1 = Math.floor((lastPoint.id - 1) / 3);
                    const col1 = (lastPoint.id - 1) % 3;
                    const row2 = Math.floor((p.id - 1) / 3);
                    const col2 = (p.id - 1) % 3;
                    
                    const dr = row2 - row1;
                    const dc = col2 - col1;

                    // Si saltas sobre un punto (la diferencia es 2 en una o ambas direcciones, y la otra es par)
                    if ((Math.abs(dr) === 2 && Math.abs(dc) % 2 === 0) || 
                        (Math.abs(dc) === 2 && Math.abs(dr) % 2 === 0)) {
                        
                        const midRow = row1 + dr / 2;
                        const midCol = col1 + dc / 2;
                        const midId = midRow * 3 + midCol + 1;
                        
                        const midPoint = points.find(pt => pt.id === midId);
                        
                        // Agregar punto intermedio si aún no está seleccionado
                        if (midPoint && !selectedPoints.includes(midPoint)) {
                            selectedPoints.push(midPoint);
                            midPoint.element.classList.add('active');
                        }
                    }
                }

                selectedPoints.push(p);
                p.element.classList.add('active');
                // Vibration feedback if available
                if (navigator.vibrate) navigator.vibrate(10);
            }
        });
    }

    function getEventPos(e) {
        if (e.touches) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function renderLine(mouseX = null, mouseY = null) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (selectedPoints.length === 0) return;

        for (let i = 1; i < selectedPoints.length; i++) {
            drawSketchLine(
                roughCanvas,
                ctx,
                selectedPoints[i - 1].x,
                selectedPoints[i - 1].y,
                selectedPoints[i].x,
                selectedPoints[i].y,
                4
            );
        }

        if (mouseX !== null && mouseY !== null) {
            const rect = grid.getBoundingClientRect();
            const lastPoint = selectedPoints[selectedPoints.length - 1];
            drawSketchLine(
                roughCanvas,
                ctx,
                lastPoint.x,
                lastPoint.y,
                mouseX - rect.left,
                mouseY - rect.top,
                3
            );
        }
    }

    // --- Game Logic ---
    function validateFigure() {
        if (selectedPoints.length < 2) return;

        // Convierta la ruta dibujada por el usuario en un conjunto de bordes normalizados
        const drawnEdges = new Set();
        for (let i = 0; i < selectedPoints.length - 1; i++) {
            const p1 = selectedPoints[i].id;
            const p2 = selectedPoints[i+1].id;
            const edgeKey = p1 < p2 ? `${p1}-${p2}` : `${p2}-${p1}`;
            drawnEdges.add(edgeKey);
        }
        
        // Find if figure exists by comparing sets
        const match = validFigures.find(p => {
            if (p.edgeSet.size !== drawnEdges.size) return false;
            for (let edge of p.edgeSet) {
                if (!drawnEdges.has(edge)) return false;
            }
            return true;
        });

        if (match) {
            if (unlockedIndices.has(match.id)) {
                showFeedback("¡Ya desbloqueaste esta figura!", '#ffae00');
            } else {
                unlockedIndices.add(match.id);
                saveProgress();
                renderList();
                showFeedback("¡Figura desbloqueada!", '#4f6f3a');
                // Scroll to top
                figureListEl.scrollTop = 0;
            }
        } else {
            showFeedback("Figura incorrecta", '#ff416c');
        }
    }

    function showFeedback(text, color) {
        messageArea.textContent = text;
        messageArea.style.color = color;
        setTimeout(() => {
            messageArea.textContent = "Dibuja una figura";
            messageArea.style.color = "#a0a0c0";
        }, 2000);
    }

    function renderList() {
        figureListEl.innerHTML = '';
        
        // Dividir figuras en desbloqueadas y bloqueadas.
        const unlocked = validFigures.filter(p => unlockedIndices.has(p.id));
        const locked = validFigures.filter(p => !unlockedIndices.has(p.id));

        [...unlocked, ...locked].forEach(figure => {
            const isUnlocked = unlockedIndices.has(figure.id);
            const el = document.createElement('div');
            el.className = `lock-item ${isUnlocked ? 'unlocked' : ''}`;
            
            // Title
            const title = document.createElement('div');
            title.className = 'lock-title';
            title.textContent = isUnlocked ? 'Figura #' + (figure.id + 1) : 'Bloqueada';
            el.appendChild(title);

            // Canvas Container
            const wrapper = document.createElement('div');
            wrapper.className = 'canvas-wrapper';
            
            const canvas = document.createElement('canvas');
            canvas.className = 'list-canvas';
            canvas.width = 140; // High resolution for display
            canvas.height = 140;
            wrapper.appendChild(canvas);

            if (isUnlocked) {
                // Draw full pattern
                drawMiniFigure(canvas, figure.segments);
            } else {
                // Draw just points and overlay
                drawMiniFigure(canvas, null);
                
                const overlay = document.createElement('div');
                overlay.className = 'lock-overlay';
                overlay.innerHTML = '🔒';
                wrapper.appendChild(overlay);
            }

            el.appendChild(wrapper);
            figureListEl.appendChild(el);
        });

        updateProgressDisplay();
    }

    function updateProgressDisplay() {
        progressCountEl.textContent = `${unlockedIndices.size} / ${validFigures.length}`;
    }

    function resetProgress() {
        if (confirm('¿Estás seguro de querer borrar todo el progreso?')) {
            unlockedIndices.clear();
            saveProgress();
            renderList();
            showFeedback("Progreso borrado", '#ff416c');
        }
    }

    // --- Solutions Modal Logic ---
    const solutionsModal = document.getElementById('solutionsModal');
    const showSolutionsBtn = document.getElementById('showSolutionsBtn');
    const closeModalBtn = document.getElementById('closeModal');
    const solutionsGrid = document.getElementById('solutionsGrid');

    if (showSolutionsBtn) {
        showSolutionsBtn.addEventListener('click', openSolutionsModal);
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeSolutionsModal);
    }
    window.addEventListener('click', (e) => {
        if (e.target === solutionsModal) closeSolutionsModal();
    });

    function openSolutionsModal() {
        solutionsModal.style.display = 'block';
        renderAllSolutions();
    }

    function closeSolutionsModal() {
        solutionsModal.style.display = 'none';
    }

    function renderAllSolutions() {
        solutionsGrid.innerHTML = '';
        
        validFigures.forEach(figure => {
            const card = document.createElement('div');
            card.className = 'solution-card';
            
            const isUnlocked = unlockedIndices.has(figure.id);
            
            // Container relative for overlay
            card.style.position = 'relative';

            const title = document.createElement('h3');
            title.textContent = `Figura #${figure.id + 1}`;
            title.style.color = isUnlocked ? '#2d2418' : '#7c6a51';
            
            const canvasWrapper = document.createElement('div');
            canvasWrapper.className = 'canvas-wrapper';
            canvasWrapper.style.width = '80px';
            canvasWrapper.style.height = '80px';
            canvasWrapper.style.margin = '0 auto';
            canvasWrapper.style.background = 'rgba(0,0,0,0.2)';

            const canvas = document.createElement('canvas');
            canvas.className = 'solution-canvas';
            canvas.width = 80;
            canvas.height = 80;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            
            canvasWrapper.appendChild(canvas);
            card.appendChild(title);
            card.appendChild(canvasWrapper);
            solutionsGrid.appendChild(card);
            
            if (isUnlocked) {
                drawMiniFigure(canvas, figure.segments);
            } else {
                drawMiniFigure(canvas, null);
                const overlay = document.createElement('div');
                overlay.className = 'lock-overlay';
                overlay.innerHTML = '🔒';
                overlay.style.fontSize = '1.5rem';
                canvasWrapper.appendChild(overlay);
            }
        });
    }

    function drawMiniFigure(canvas, segments) {
        const ctx = canvas.getContext('2d');
        const miniRough = window.rough ? rough.canvas(canvas) : null;
        const padding = 20;
        const size = canvas.width;
        const cellSize = (size - 2 * padding) / 2;

        const getCoords = (id) => {
            const row = Math.floor((id - 1) / 3);
            const col = (id - 1) % 3;
            return {
                x: padding + col * cellSize,
                y: padding + row * cellSize
            }; // 1-based index to 0-based row/col
        };

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for(let i=1; i<=9; i++) {
            const {x, y} = getCoords(i);
            drawSketchPoint(miniRough, ctx, x, y, size <= 90 ? 5 : 7);
        }

        if (!segments || segments.length === 0) return;

        segments.forEach(seg => {
            const start = getCoords(seg[0]);
            const end = getCoords(seg[1]);
            drawSketchLine(miniRough, ctx, start.x, start.y, end.x, end.y, size <= 90 ? 2 : 3);
        });

    }

    function drawSketchLine(roughSurface, ctx, x1, y1, x2, y2, strokeWidth) {
        if (roughSurface) {
            roughSurface.line(x1, y1, x2, y2, {
                stroke: '#2d2418',
                strokeWidth,
                roughness: 1.7,
                bowing: 1.4
            });
            return;
        }

        ctx.strokeStyle = '#2d2418';
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let pass = 0; pass < 2; pass++) {
            const startJitter = sketchJitter(x1 + y1 + pass, 1.8);
            const endJitter = sketchJitter(x2 + y2 + pass, 1.8);
            const controlJitter = sketchJitter(x1 + x2 + y1 + y2 + pass, 5);

            ctx.beginPath();
            ctx.moveTo(x1 + startJitter.x, y1 + startJitter.y);
            ctx.quadraticCurveTo(
                (x1 + x2) / 2 + controlJitter.x,
                (y1 + y2) / 2 + controlJitter.y,
                x2 + endJitter.x,
                y2 + endJitter.y
            );
            ctx.stroke();
        }
    }

    function drawSketchPoint(roughSurface, ctx, x, y, diameter) {
        if (roughSurface) {
            roughSurface.circle(x, y, diameter, {
                stroke: '#2d2418',
                strokeWidth: 1.4,
                fill: '#f7efe1',
                fillStyle: 'solid',
                roughness: 1.9
            });
            return;
        }

        ctx.fillStyle = '#f7efe1';
        ctx.strokeStyle = '#2d2418';
        ctx.lineWidth = 1.4;

        for (let pass = 0; pass < 2; pass++) {
            const jitter = sketchJitter(x + y + pass, 1.2);
            ctx.beginPath();
            ctx.ellipse(
                x + jitter.x,
                y + jitter.y,
                diameter / 2,
                diameter / 2.4,
                pass * 0.45,
                0,
                Math.PI * 2
            );
            if (pass === 0) ctx.fill();
            ctx.stroke();
        }
    }

    function sketchJitter(seed, amount) {
        return {
            x: Math.sin(seed * 12.9898) * amount,
            y: Math.cos(seed * 78.233) * amount
        };
    }
});
