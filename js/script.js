document.addEventListener('DOMContentLoaded', async function() {
    // --- Configuration & State ---
    const STORAGE_KEY = 'figureLock_progress';
    let validFigures = []; // Stores objects: { id: index, pathString: "1-2-3" }
    let unlockedIndices = new Set();
    
    // --- DOM Elements ---
    const grid = document.getElementById('figureGrid');
    const canvas = document.getElementById('lineCanvas');
    const ctx = canvas.getContext('2d');
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
                    edgeSet: edgeSet
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

        ctx.beginPath();
        ctx.strokeStyle = '#00dbde';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00dbde';

        ctx.moveTo(selectedPoints[0].x, selectedPoints[0].y);
        for (let i = 1; i < selectedPoints.length; i++) {
            ctx.lineTo(selectedPoints[i].x, selectedPoints[i].y);
        }

        if (mouseX !== null && mouseY !== null) {
            const rect = grid.getBoundingClientRect();
            ctx.lineTo(mouseX - rect.left, mouseY - rect.top);
        }
        ctx.stroke();
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
                showFeedback("¡Figura desbloqueada!", '#00dbde');
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

        // Note: ¿Ordenar la lógica para colocar los desbloqueados más recientemente en la parte superior?
        // Prompt says "Las figuras desbloqueadas deben aparecer al inicio".
        // Simplemente apilemos desbloqueado y luego bloqueado.

        [...unlocked, ...locked].forEach(figure => {
            const isUnlocked = unlockedIndices.has(figure.id);
            const el = document.createElement('div');
            el.className = `lock-item ${isUnlocked ? 'unlocked' : ''}`;
            
            el.innerHTML = `
                <div class="lock-icon">${isUnlocked ? '🔓' : '🔒'}</div>
                <div class="lock-info">
                    <div class="lock-title">${isUnlocked ? 'Figura #' + (figure.id + 1) : 'Bloqueada'}</div>
                    <div class="figure-preview">${isUnlocked ? figure.pathString : '???'}</div>
                </div>
            `;
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
});
