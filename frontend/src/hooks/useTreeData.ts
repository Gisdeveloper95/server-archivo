/**
 * Hook para manejar el estado del árbol de archivos
 * Soporta carga bajo demanda (lazy loading) y estado de expansión
 */
import { useState, useCallback } from 'react';
import { filesApi } from '../api/files';
import type { FileItem } from '../types';

export interface TreeNode extends FileItem {
  children?: TreeNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
  isLoaded?: boolean;
  depth: number;
}

interface UseTreeDataOptions {
  initialPath: string;
  initialFiles: FileItem[];
}

export const useTreeData = ({ initialPath, initialFiles }: UseTreeDataOptions) => {
  // Ordenar archivos: directorios primero, luego por nombre
  const sortFiles = (files: FileItem[]): FileItem[] => {
    const directories = files.filter(f => f.is_directory);
    const regularFiles = files.filter(f => !f.is_directory);

    const sortByName = (a: FileItem, b: FileItem) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase());

    return [...directories.sort(sortByName), ...regularFiles.sort(sortByName)];
  };

  // Convertir archivos iniciales a nodos del árbol
  const filesToNodes = (files: FileItem[], depth: number): TreeNode[] => {
    // Ordenar antes de convertir
    const sortedFiles = sortFiles(files);

    return sortedFiles.map(file => ({
      ...file,
      depth,
      isExpanded: false,
      isLoading: false,
      isLoaded: false,
      children: file.is_directory ? [] : undefined,
    }));
  };

  const [treeData, setTreeData] = useState<TreeNode[]>(() =>
    filesToNodes(initialFiles, 0)
  );
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Actualizar datos cuando cambian los archivos iniciales
  const updateInitialData = useCallback((files: FileItem[]) => {
    setTreeData(filesToNodes(files, 0));
    setExpandedPaths(new Set());
  }, []);

  // Encontrar y actualizar un nodo en el árbol
  const updateNodeInTree = useCallback((
    nodes: TreeNode[],
    targetPath: string,
    updater: (node: TreeNode) => TreeNode
  ): TreeNode[] => {
    return nodes.map(node => {
      if (node.path === targetPath) {
        return updater(node);
      }
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: updateNodeInTree(node.children, targetPath, updater),
        };
      }
      return node;
    });
  }, []);

  // Expandir un nodo (cargar sus hijos si es necesario)
  const expandNode = useCallback(async (nodePath: string) => {
    // Marcar como cargando
    setTreeData(prev => updateNodeInTree(prev, nodePath, node => ({
      ...node,
      isLoading: true,
    })));

    try {
      // Cargar hijos desde la API
      const response = await filesApi.browseLive({ path: nodePath });

      if (response.success && response.data.files) {
        const childNodes = filesToNodes(response.data.files,
          // Calcular profundidad basada en la ruta
          nodePath.split('/').filter(Boolean).length + 1
        );

        setTreeData(prev => updateNodeInTree(prev, nodePath, node => ({
          ...node,
          children: childNodes,
          isExpanded: true,
          isLoading: false,
          isLoaded: true,
        })));

        setExpandedPaths(prev => new Set([...prev, nodePath]));
      }
    } catch (error) {
      console.error('Error loading children:', error);
      setTreeData(prev => updateNodeInTree(prev, nodePath, node => ({
        ...node,
        isLoading: false,
        isExpanded: false,
      })));
    }
  }, [updateNodeInTree]);

  // Colapsar un nodo
  const collapseNode = useCallback((nodePath: string) => {
    setTreeData(prev => updateNodeInTree(prev, nodePath, node => ({
      ...node,
      isExpanded: false,
    })));

    setExpandedPaths(prev => {
      const newSet = new Set(prev);
      newSet.delete(nodePath);
      return newSet;
    });
  }, [updateNodeInTree]);

  // Toggle expandir/colapsar
  const toggleNode = useCallback(async (node: TreeNode) => {
    if (!node.is_directory) return;

    if (node.isExpanded) {
      collapseNode(node.path);
    } else {
      await expandNode(node.path);
    }
  }, [expandNode, collapseNode]);

  // Expandir todos los nodos hasta una profundidad específica
  const expandToDepth = useCallback(async (maxDepth: number) => {
    const expandRecursive = async (nodes: TreeNode[], currentDepth: number) => {
      if (currentDepth >= maxDepth) return;

      for (const node of nodes) {
        if (node.is_directory && !node.isExpanded) {
          await expandNode(node.path);
          // Esperar un poco para no saturar la API
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    };

    await expandRecursive(treeData, 0);
  }, [treeData, expandNode]);

  // Colapsar todos
  const collapseAll = useCallback(() => {
    const collapseRecursive = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => ({
        ...node,
        isExpanded: false,
        children: node.children ? collapseRecursive(node.children) : undefined,
      }));
    };

    setTreeData(prev => collapseRecursive(prev));
    setExpandedPaths(new Set());
  }, []);

  // Refrescar un nodo específico
  const refreshNode = useCallback(async (nodePath: string) => {
    // Si es la raíz, refrescar todo
    if (!nodePath) {
      // Esto debería manejarse externamente
      return;
    }

    // Recargar los hijos del nodo
    try {
      const response = await filesApi.browseLive({ path: nodePath });

      if (response.success && response.data.files) {
        const depth = nodePath.split('/').filter(Boolean).length + 1;
        const childNodes = filesToNodes(response.data.files, depth);

        setTreeData(prev => updateNodeInTree(prev, nodePath, node => ({
          ...node,
          children: childNodes,
        })));
      }
    } catch (error) {
      console.error('Error refreshing node:', error);
    }
  }, [updateNodeInTree]);

  // Obtener lista plana de todos los nodos visibles (para renderizado eficiente)
  const getVisibleNodes = useCallback((): TreeNode[] => {
    const result: TreeNode[] = [];

    const traverse = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        result.push(node);
        if (node.isExpanded && node.children) {
          traverse(node.children);
        }
      }
    };

    traverse(treeData);
    return result;
  }, [treeData]);

  return {
    treeData,
    expandedPaths,
    toggleNode,
    expandNode,
    collapseNode,
    expandToDepth,
    collapseAll,
    refreshNode,
    updateInitialData,
    getVisibleNodes,
  };
};
