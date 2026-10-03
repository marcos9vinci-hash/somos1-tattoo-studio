# Painel Admin & Configurações — Design Técnico (Design)

> Status: 🟢 CONFIRMADO (Código Legado)
> Layout: Feature-Folder / Módulo

---

## 1. Arquitetura de Isolamento de Erros (`ModuleErrorBoundary`)

```typescript
class ModuleErrorBoundary extends Component<
  { children: ReactNode; moduleName: string },
  { hasError: boolean; error: Error | null }
> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Erro no módulo ${this.props.moduleName}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <MaintenanceBlockFallback moduleName={this.props.moduleName} onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```

---

## 2. Serviço de Auditoria de Crédito (`creditService`)
1. Operação `addCreditTransaction` recebe `userId`, `amount`, `type`, `description`.
2. Executa `updateDoc(doc(db, 'users', userId))` incrementando `creditsBalance`.
3. Executa `addDoc(collection(db, 'transactions'))` gravando o registro imutável com `serverTimestamp()`.
4. Dispara notificação push/in-app para o usuário informando a movimentação.
