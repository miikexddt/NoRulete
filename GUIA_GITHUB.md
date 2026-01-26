# Guía: Subida limpia a GitHub desde 0

Sigue estos pasos en orden para limpiar lo que se hizo antes y asegurar que todo tu proyecto (ruleta, sonidos, videos y SEO) suba correctamente.

### 1. Limpieza Inicial
Borraremos la configuración de Git anterior que está dando problemas. Escribe esto en tu terminal:
```bash
rm -rf .git
```

### 2. Configura tu Identidad (Solo se hace una vez)
Git necesita saber quién eres para permitirte guardar cambios. Reemplaza lo que está entre comillas con tus datos de GitHub:
```bash
git config --global user.email "tu-correo@ejemplo.com"
git config --global user.name "tu-nombre-de-usuario"
```

### 3. Inicializa el Proyecto
Ahora crearemos el repositorio desde cero:
```bash
git init
```

### 4. Añade TODO el proyecto
Es muy importante usar el **punto**. Esto añade el HTML, el JS, los sonidos y el video:
```bash
git add .
```

### 5. Guarda tus cambios (Commit)
Este es el paso que fallaba antes. Ahora que ya tienes nombre y correo, funcionará:
```bash
git commit -m "Carga completa de NoRulete con SEO y video fix"
```

### 6. Conecta con GitHub
Asegúrate de que la rama se llame `main` y conecta con tu link:
```bash
git branch -M main
git remote add origin https://github.com/miikexddt/NoRulete.git
```

### 7. ¡Sube tu página!
Este comando mandará todo a internet:
```bash
git push -u origin main
```
