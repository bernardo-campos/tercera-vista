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
    // Si está presente 4-8, no debe estar presentes 2-7, 5-7
    if (edgePresent(combo, EDGE_4_8) && (edgePresent(combo, EDGE_2_7) || edgePresent(combo, EDGE_5_7) )) return true;
    // Si está presente 5-7, no debe estar presentes 1-8, 4-8
    if (edgePresent(combo, EDGE_5_7) && (edgePresent(combo, EDGE_1_8) || edgePresent(combo, EDGE_4_8))) return true;
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

// Ordena pares para formar un camino/ciclo coherente
function ordenarPares(arr) {
    const n = arr.length;
    const usados = new Array(n).fill(false);

    // Mapa: número -> índices de pares donde aparece
    const mapa = new Map();

    arr.forEach(([a, b], i) => {
        if (!mapa.has(a)) mapa.set(a, []);
        if (!mapa.has(b)) mapa.set(b, []);
        mapa.get(a).push(i);
        mapa.get(b).push(i);
    });

    const resultado = [];
    let parActual = arr[0].slice(); // copiamos el primero
    usados[0] = true;
    resultado.push(parActual);

    while (resultado.length < n) {
        const segundoComponente = parActual[1];
        const candidatos = mapa.get(segundoComponente);

        let siguienteIdx = candidatos.find(i => !usados[i]);
        if (siguienteIdx === undefined) break;

        let [x, y] = arr[siguienteIdx];
        usados[siguienteIdx] = true;

        // Asegurar que encaje
        if (x !== segundoComponente) {
            [x, y] = [y, x];
        }

        parActual = [x, y];
        resultado.push(parActual);
    }

    return resultado;
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
    let edges = comboToEdges(combo);
    return ordenarPares(edges).map(pair => `${pair[0]}-${pair[1]}`).join(', ');
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
        if (
            // Deben estar al menos una de las aristas inferiores (base)
            !(edgePresent(combo, EDGE_7_8) || edgePresent(combo, EDGE_8_9))
            // aristas para que la figura se mantenga de pie:
            // && !(edgePresent(combo, EDGE_5_7) && edgePresent(combo, EDGE_5_9))
            // && !(edgePresent(combo, EDGE_5_7) && edgePresent(combo, EDGE_6_8))
            // && !(edgePresent(combo, EDGE_4_8) && edgePresent(combo, EDGE_5_9))
        ) continue;
        // Volumen arriba:
        if (
            !edgePresent(combo, EDGE_1_5) && 
            !edgePresent(combo, EDGE_2_4) &&
            !edgePresent(combo, EDGE_3_5) && 
            !edgePresent(combo, EDGE_2_5) && 
            !edgePresent(combo, EDGE_2_6) && 
            !edgePresent(combo, EDGE_3_6)
        ) continue;
        // Volumen derecha (evita el ciclo 1-5-8-7-4-1):
        if (
            !edgePresent(combo, EDGE_2_3) &&
            !edgePresent(combo, EDGE_5_6) &&
            !edgePresent(combo, EDGE_8_9) &&
            !edgePresent(combo, EDGE_2_6) &&
            !edgePresent(combo, EDGE_3_5) &&
            !edgePresent(combo, EDGE_5_9) &&
            !edgePresent(combo, EDGE_6_8)
        ) continue;
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
        console.log(`${idx + 1}: ${comboToString(combo)} | ${combo}`);
    });

    // Guardar resultados en archivo JSON
    const output = patterns.map(combo => comboToEdges(combo));
    fs.writeFileSync('patrones.json', JSON.stringify(output, null, 2));
    console.log('\nPatrones guardados en "patrones.json"');
}

if (require.main === module) {
    main();
}

module.exports = {
    edges,
    violatesCrossing,
    isSimpleCycle,
    comboToString,
    findAllPatterns
};