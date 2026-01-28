#!/usr/bin/env node
/**
 * Script de Verificación Automática del Sistema QR
 * 
 * Este script verifica que todas las correcciones del sistema QR
 * estén correctamente implementadas y funcionando.
 * 
 * Uso: node verify-qr-system.js
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..', '..', 'egea-Main-control');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
    const fullPath = path.join(SRC_DIR, filePath);
    const exists = fs.existsSync(fullPath);

    if (exists) {
        log(`✓ ${description}`, 'green');
        return true;
    } else {
        log(`✗ ${description} - Archivo no encontrado: ${filePath}`, 'red');
        return false;
    }
}

function checkFileContains(filePath, searchString, description) {
    const fullPath = path.join(SRC_DIR, filePath);

    if (!fs.existsSync(fullPath)) {
        log(`✗ ${description} - Archivo no encontrado`, 'red');
        return false;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const contains = content.includes(searchString);

    if (contains) {
        log(`✓ ${description}`, 'green');
        return true;
    } else {
        log(`✗ ${description} - No se encontró: "${searchString}"`, 'red');
        return false;
    }
}

function countOccurrences(filePath, searchString) {
    const fullPath = path.join(SRC_DIR, filePath);

    if (!fs.existsSync(fullPath)) {
        return 0;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const matches = content.match(new RegExp(searchString, 'g'));
    return matches ? matches.length : 0;
}

// ============================================
// VERIFICACIONES
// ============================================

log('\n╔══════════════════════════════════════════════╗', 'cyan');
log('║  Verificación del Sistema QR Corregido      ║', 'cyan');
log('╚══════════════════════════════════════════════╝\n', 'cyan');

let totalChecks = 0;
let passedChecks = 0;

// 1. Verificar que existe qr-utils.ts
log('\n📦 Verificando Utilidades de QR...', 'blue');
if (checkFileExists('lib/qr-utils.ts', 'Archivo qr-utils.ts existe')) {
    totalChecks++; passedChecks++;

    // Verificar funciones exportadas
    const checks = [
        ['lib/qr-utils.ts', 'export function generateQRPayload', 'Función generateQRPayload exportada'],
        ['lib/qr-utils.ts', 'export function parseQRCode', 'Función parseQRCode exportada'],
        ['lib/qr-utils.ts', 'export function validateQRAgainstOrder', 'Función validateQRAgainstOrder exportada'],
        ['lib/qr-utils.ts', 'export function extractOrderNumber', 'Función extractOrderNumber exportada'],
    ];

    checks.forEach(([file, search, desc]) => {
        totalChecks++;
        if (checkFileContains(file, search, desc)) passedChecks++;
    });
} else {
    totalChecks++;
}

// 2. Verificar imports en archivos modificados
log('\n📥 Verificando Imports...', 'blue');
const importChecks = [
    ['components/commercial/QRCodeGenerator.tsx', 'from \'@/lib/qr-utils\'', 'QRCodeGenerator importa qr-utils'],
    ['hooks/use-orders.ts', 'from \'@/lib/qr-utils\'', 'use-orders importa qr-utils'],
    ['pages/ProductionPage.tsx', 'from \'@/lib/qr-utils\'', 'ProductionPage importa qr-utils'],
    ['pages/ShippingScanPage.tsx', 'from \'@/lib/qr-utils\'', 'ShippingScanPage importa qr-utils'],
    ['pages/KioskDisplayPage.tsx', 'from \'@/lib/qr-utils\'', 'KioskDisplayPage importa qr-utils'],
];

importChecks.forEach(([file, search, desc]) => {
    totalChecks++;
    if (checkFileContains(file, search, desc)) passedChecks++;
});

// 3. Verificar uso de generateQRPayload
log('\n🔧 Verificando Uso de generateQRPayload...', 'blue');
const generateChecks = [
    ['components/commercial/QRCodeGenerator.tsx', 'generateQRPayload', 'QRCodeGenerator usa generateQRPayload'],
    ['hooks/use-orders.ts', 'generateQRPayload', 'use-orders usa generateQRPayload'],
];

generateChecks.forEach(([file, search, desc]) => {
    totalChecks++;
    if (checkFileContains(file, search, desc)) passedChecks++;
});

// 4. Verificar uso de parseQRCode
log('\n🔍 Verificando Uso de parseQRCode...', 'blue');
const parseChecks = [
    ['pages/ProductionPage.tsx', 'parseQRCode', 'ProductionPage usa parseQRCode'],
    ['pages/ShippingScanPage.tsx', 'parseQRCode', 'ShippingScanPage usa parseQRCode'],
    ['pages/KioskDisplayPage.tsx', 'parseQRCode', 'KioskDisplayPage usa parseQRCode'],
];

parseChecks.forEach(([file, search, desc]) => {
    totalChecks++;
    if (checkFileContains(file, search, desc)) passedChecks++;
});

// 5. Verificar uso de validateQRAgainstOrder
log('\n✅ Verificando Uso de validateQRAgainstOrder...', 'blue');
const validateChecks = [
    ['pages/ProductionPage.tsx', 'validateQRAgainstOrder', 'ProductionPage usa validateQRAgainstOrder'],
    ['pages/ShippingScanPage.tsx', 'validateQRAgainstOrder', 'ShippingScanPage usa validateQRAgainstOrder'],
];

validateChecks.forEach(([file, search, desc]) => {
    totalChecks++;
    if (checkFileContains(file, search, desc)) passedChecks++;
});

// 6. Verificar que qr_payload está en los tipos
log('\n📝 Verificando Tipos TypeScript...', 'blue');
const typeChecks = [
    ['types/production.ts', 'qr_payload', 'Tipo WorkOrder incluye qr_payload'],
    ['pages/ProductionPage.tsx', 'qr_payload', 'ProductionPage usa qr_payload'],
];

typeChecks.forEach(([file, search, desc]) => {
    totalChecks++;
    if (checkFileContains(file, search, desc)) passedChecks++;
});

// 7. Verificar alertas de discrepancias
log('\n⚠️  Verificando Alertas de Discrepancias...', 'blue');
const alertChecks = [
    ['pages/ProductionPage.tsx', 'hasDiscrepancies', 'ProductionPage verifica discrepancias'],
    ['pages/ShippingScanPage.tsx', 'hasDiscrepancies', 'ShippingScanPage verifica discrepancias'],
    ['pages/ProductionPage.tsx', 'isLegacyFormat', 'ProductionPage detecta formato antiguo'],
    ['pages/ShippingScanPage.tsx', 'isLegacyFormat', 'ShippingScanPage detecta formato antiguo'],
];

alertChecks.forEach(([file, search, desc]) => {
    totalChecks++;
    if (checkFileContains(file, search, desc)) passedChecks++;
});

// ============================================
// RESUMEN
// ============================================

log('\n╔══════════════════════════════════════════════╗', 'cyan');
log('║              RESUMEN DE VERIFICACIÓN         ║', 'cyan');
log('╚══════════════════════════════════════════════╝\n', 'cyan');

const percentage = Math.round((passedChecks / totalChecks) * 100);
const color = percentage === 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red';

log(`Total de verificaciones: ${totalChecks}`, 'blue');
log(`Verificaciones pasadas: ${passedChecks}`, 'green');
log(`Verificaciones fallidas: ${totalChecks - passedChecks}`, 'red');
log(`Porcentaje de éxito: ${percentage}%\n`, color);

if (percentage === 100) {
    log('🎉 ¡Todas las verificaciones pasaron exitosamente!', 'green');
    log('✅ El sistema QR está correctamente implementado.\n', 'green');
    process.exit(0);
} else if (percentage >= 80) {
    log('⚠️  La mayoría de verificaciones pasaron, pero hay algunos problemas.', 'yellow');
    log('🔧 Revisa los errores anteriores y corrígelos.\n', 'yellow');
    process.exit(1);
} else {
    log('❌ Muchas verificaciones fallaron.', 'red');
    log('🚨 El sistema QR necesita correcciones importantes.\n', 'red');
    process.exit(1);
}
