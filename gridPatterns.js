// Script completo para encontrar y visualizar patrones en cuadrícula 3x3
const fs = require('fs');

// Todas las aristas permitidas (22 aristas)
const edges = [
    [1, 2], [2, 3], // fila superior horizontal
    [4, 5], [5, 6], // fila media horizontal
    [7, 8], [8, 9], // fila inferior horizontal
    [1, 5], [2, 4], [2, 6], [3, 5], // diagonales
    [4, 8], [5, 7], [5, 9], [6, 8],
    [1, 8], [2, 7], // más
    [1, 4], [2, 5], [3, 6], [4, 7], [5, 8], [6, 9]
];

// Mapeo de arista a índice
function findEdge(a, b) {
    const idx = edges.findIndex(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a));
    if (idx === -1) throw new Error(`Arista ${a}-${b} no encontrada`);
    return idx;
}

const EDGE_1_2 = findEdge(1, 2);
const EDGE_2_3 = findEdge(2, 3);
const EDGE_4_5 = findEdge(4, 5);
const EDGE_5_6 = findEdge(5, 6);
const EDGE_7_8 = findEdge(7, 8);
const EDGE_8_9 = findEdge(8, 9);
const EDGE_1_5 = findEdge(1, 5);
const EDGE_2_4 = findEdge(2, 4);
const EDGE_2_6 = findEdge(2, 6);
const EDGE_3_5 = findEdge(3, 5);
const EDGE_4_8 = findEdge(4, 8);
const EDGE_5_7 = findEdge(5, 7);
const EDGE_5_9 = findEdge(5, 9);
const EDGE_6_8 = findEdge(6, 8);
const EDGE_1_8 = findEdge(1, 8);
const EDGE_2_7 = findEdge(2, 7);
// const EDGE_1_4 = findEdge(1, 4);
const EDGE_2_5 = findEdge(2, 5);
const EDGE_3_6 = findEdge(3, 6);
const EDGE_4_7 = findEdge(4, 7);
const EDGE_5_8 = findEdge(5, 8);
const EDGE_6_9 = findEdge(6, 9);

function edgePresent(combo, idx) {
    return ((combo >> idx) & 1) === 1;
}

// Restricciones de cruce según especificación
function violatesCrossing(combo) {
    // Si está presente 2-6, no debe estar presente 3-5 (y viceversa)
    if (edgePresent(combo, EDGE_2_6) && edgePresent(combo, EDGE_3_5)) return true;
    // Si está presente 5-9, no debe estar presente 6-8 (y viceversa)
    if (edgePresent(combo, EDGE_5_9) && edgePresent(combo, EDGE_6_8)) return true;
    // Si está presente 1-5, no debe estar presentes 2-4, 2-7
    if (edgePresent(combo, EDGE_1_5) && (edgePresent(combo, EDGE_2_4) || edgePresent(combo, EDGE_2_7))) return true;
    // Si está presente 2-4, no debe estar presentes 1-5, 1-8
    if (edgePresent(combo, EDGE_2_4) && (edgePresent(combo, EDGE_1_5) || edgePresent(combo, EDGE_1_8))) return true;
    // Si está presente 1-8, no debe estar presentes 2-7, 2-4, 4-5, 5-7
    if (edgePresent(combo, EDGE_1_8) && (edgePresent(combo, EDGE_2_7) || edgePresent(combo, EDGE_2_4) || edgePresent(combo, EDGE_4_5) || edgePresent(combo, EDGE_5_7))) return true;
    // Si está presente 2-7, no debe estar presentes 1-5, 1-8, 4-5, 4-8
    if (edgePresent(combo, EDGE_2_7) && (edgePresent(combo, EDGE_1_5) || edgePresent(combo, EDGE_1_8) || edgePresent(combo, EDGE_4_5) || edgePresent(combo, EDGE_4_8))) return true;
    // Si está presente 4-8, no debe estar presentes 2-7, 5-7 (cruce), 4-7, 4-8, 1-8 (invalida la vista)
    if (edgePresent(combo, EDGE_4_8) && (edgePresent(combo, EDGE_2_7) || edgePresent(combo, EDGE_5_7) || edgePresent(combo, EDGE_4_7) || edgePresent(combo, EDGE_4_8) || edgePresent(combo, EDGE_1_8))) return true;
    // Si está presente 5-7, no debe estar presentes 1-8, 4-8
    if (edgePresent(combo, EDGE_4_8) && (edgePresent(combo, EDGE_1_8) || edgePresent(combo, EDGE_4_8))) return true;
    // Además, no deben estar presentes al mismo tiempo:
    if (edgePresent(combo, EDGE_1_2) && edgePresent(combo, EDGE_2_3)) return true;
    if (edgePresent(combo, EDGE_3_6) && edgePresent(combo, EDGE_6_9)) return true;
    if (edgePresent(combo, EDGE_2_5) && edgePresent(combo, EDGE_5_8)) return true;
    if (edgePresent(combo, EDGE_4_5) && edgePresent(combo, EDGE_5_6)) return true;
    if (edgePresent(combo, EDGE_1_5) && edgePresent(combo, EDGE_5_9)) return true;
    if (edgePresent(combo, EDGE_3_5) && edgePresent(combo, EDGE_5_7)) return true;
    return false;
}

// Verifica si el subconjunto de aristas forma un ciclo simple
function isSimpleCycle(combo) {
    const adj = Array.from({ length: 10 }, () => []); // índices 1..9
    let edgeCount = 0;
    for (let i = 0; i < edges.length; i++) {
        if (edgePresent(combo, i)) {
            const [a, b] = edges[i];
            adj[a].push(b);
            adj[b].push(a);
            edgeCount++;
        }
    }
    if (edgeCount === 0) return false;
    // Encontrar primer nodo con aristas
    let start = 0;
    for (let i = 1; i <= 9; i++) {
        if (adj[i].length > 0) {
            start = i;
            break;
        }
    }
    if (start === 0) return false;
    // Verificar grados: todos deben ser 0 o 2 (condición para ciclo simple)
    for (let i = 1; i <= 9; i++) {
        const deg = adj[i].length;
        if (deg !== 0 && deg !== 2) return false;
    }
    // Verificar conexidad: BFS desde start
    const visited = new Set();
    const queue = [start];
    visited.add(start);
    while (queue.length) {
        const v = queue.shift();
        for (const nb of adj[v]) {
            if (!visited.has(nb)) {
                visited.add(nb);
                queue.push(nb);
            }
        }
    }
    // Todos los nodos con grado >0 deben estar visitados
    for (let i = 1; i <= 9; i++) {
        if (adj[i].length > 0 && !visited.has(i)) return false;
    }
    return true;
}

// Convierte combinación a lista de aristas
function comboToEdges(combo) {
    const selected = [];
    for (let i = 0; i < edges.length; i++) {
        if (edgePresent(combo, i)) {
            selected.push(edges[i]);
        }
    }
    return selected;
}

function comboToString(combo) {
    return comboToEdges(combo).map(pair => `${pair[0]}-${pair[1]}`).join(', ');
}

// Dibuja la cuadrícula con las aristas seleccionadas
function drawPattern(combo) {
    // Matriz 5x5 para representar posiciones
    // Coordenadas (fila, columna):
    // 1: (0,0), 2: (0,2), 3: (0,4)
    // 4: (2,0), 5: (2,2), 6: (2,4)
    // 7: (4,0), 8: (4,2), 9: (4,4)
    const grid = [
        ['1', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' '],
        [' ', ' ', ' ', ' ', ' ']
    ];
    // Poner números en sus posiciones
    grid[0][0] = '1'; grid[0][2] = '2'; grid[0][4] = '3';
    grid[2][0] = '4'; grid[2][2] = '5'; grid[2][4] = '6';
    grid[4][0] = '7'; grid[4][2] = '8'; grid[4][4] = '9';

    // Función para trazar línea entre dos puntos
    function drawLine(r1, c1, r2, c2) {
        if (r1 === r2) {
            // horizontal
            const colStart = Math.min(c1, c2);
            const colEnd = Math.max(c1, c2);
            for (let c = colStart + 1; c < colEnd; c++) {
                grid[r1][c] = '─';
            }
        } else if (c1 === c2) {
            // vertical
            const rowStart = Math.min(r1, r2);
            const rowEnd = Math.max(r1, r2);
            for (let r = rowStart + 1; r < rowEnd; r++) {
                grid[r][c1] = '│';
            }
        } else {
            // diagonal
            const dr = r2 - r1;
            const dc = c2 - c1;
            if (dr === 2 && dc === 2) {
                // diagonal sureste
                grid[r1 + 1][c1 + 1] = '\\';
            } else if (dr === 2 && dc === -2) {
                // diagonal suroeste
                grid[r1 + 1][c1 - 1] = '/';
            } else if (dr === -2 && dc === 2) {
                // diagonal noreste
                grid[r1 - 1][c1 + 1] = '/';
            } else if (dr === -2 && dc === -2) {
                // diagonal noroeste
                grid[r1 - 1][c1 - 1] = '\\';
            } else if (dr === 4 && dc === 2) {
                // diagonal larga (1-8)
                grid[r1 + 1][c1 + 1] = '\\';
                grid[r1 + 2][c1 + 2] = '\\';
                grid[r1 + 3][c1 + 3] = '\\';
            } else if (dr === 4 && dc === -2) {
                // diagonal larga (2-7)
                grid[r1 + 1][c1 - 1] = '/';
                grid[r1 + 2][c1 - 2] = '/';
                grid[r1 + 3][c1 - 3] = '/';
            } else {
                // otras diagonales (como 1-5, 2-6, etc.)
                const midR = (r1 + r2) / 2;
                const midC = (c1 + c2) / 2;
                if (dr > 0 && dc > 0) grid[midR][midC] = '\\';
                else if (dr > 0 && dc < 0) grid[midR][midC] = '/';
                else if (dr < 0 && dc > 0) grid[midR][midC] = '/';
                else grid[midR][midC] = '\\';
            }
        }
    }

    // Mapeo de aristas a coordenadas
    const coord = {
        1: [0,0], 2: [0,2], 3: [0,4],
        4: [2,0], 5: [2,2], 6: [2,4],
        7: [4,0], 8: [4,2], 9: [4,4]
    };

    // Dibujar cada arista presente
    for (let i = 0; i < edges.length; i++) {
        if (edgePresent(combo, i)) {
            const [a, b] = edges[i];
            const [r1, c1] = coord[a];
            const [r2, c2] = coord[b];
            drawLine(r1, c1, r2, c2);
        }
    }

    // Construir string
    let result = '';
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            result += grid[r][c];
        }
        result += '\n';
    }
    return result;
}

// Búsqueda principal
function findAllPatterns() {
    const totalEdges = edges.length;
    const totalCombos = 1 << totalEdges;
    console.log(`Buscando patrones...`);
    console.log(`Aristas posibles: ${totalEdges}`);
    console.log(`Combinaciones totales: ${totalCombos}`);
    const results = [];
    for (let combo = 0; combo < totalCombos; combo++) {
        // Condición: al menos una de (7-8) o (8-9) presente
        if (!edgePresent(combo, EDGE_7_8) && !edgePresent(combo, EDGE_8_9)) continue;
        // Volumen arriba (al menos uno de estas aristas):
        if (!edgePresent(combo, EDGE_1_5) && !edgePresent(combo, EDGE_2_5) && !edgePresent(combo, EDGE_3_5) && !edgePresent(combo, EDGE_2_5) && !edgePresent(combo, EDGE_2_6) && !edgePresent(combo, EDGE_3_6)) continue;
        // Verificar restricciones de cruce
        if (violatesCrossing(combo)) continue;
        // Verificar que sea un ciclo simple
        if (!isSimpleCycle(combo)) continue;
        results.push(combo);
    }
    return results;
}

// Ejecutar y mostrar resultados
function main() {
    const patterns = findAllPatterns();
    console.log(`\nPatrones encontrados: ${patterns.length}`);
    console.log('\nLista de patrones (aristas):');
    patterns.forEach((combo, idx) => {
        console.log(`${idx + 1}: ${comboToString(combo)}`);
    });

    // Guardar resultados en archivo JSON
    const output = patterns.map(combo => comboToEdges(combo));
    fs.writeFileSync('patrones.json', JSON.stringify(output, null, 2));
    console.log('\nPatrones guardados en "patrones.json"');

    // Mostrar visualización de los primeros 3 patrones
    const showCount = Math.min(3, patterns.length);
    if (showCount > 0) {
        console.log('\nVisualización de los primeros', showCount, 'patrones:');
        for (let i = 0; i < showCount; i++) {
            console.log(`\nPatrón ${i + 1}:`);
            console.log(drawPattern(patterns[i]));
        }
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    edges,
    violatesCrossing,
    isSimpleCycle,
    comboToString,
    drawPattern,
    findAllPatterns
};