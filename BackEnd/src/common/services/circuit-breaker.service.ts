import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MetricsService } from './metrics.service'

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerOptions {
  failureThreshold: number
  recoveryTimeoutMs: number
  halfOpenSuccessThreshold: number
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  recoveryTimeoutMs: 30_000,
  halfOpenSuccessThreshold: 2,
}

interface BreakerState {
  state: CircuitState
  failureCount: number
  halfOpenSuccessCount: number
  lastFailureTime: number
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name)
  private readonly breakers = new Map<string, BreakerState>()

  constructor(
    private readonly configService: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  async callWithBreaker<T>(
    key: string,
    operation: () => Promise<T>,
    options?: Partial<CircuitBreakerOptions>,
  ): Promise<T> {
    const opts = this.resolveOptions(options)
    const state = this.getOrCreateState(key)

    if (state.state === 'OPEN') {
      if (Date.now() - state.lastFailureTime >= opts.recoveryTimeoutMs) {
        this.transitionTo(key, state, 'HALF_OPEN')
      } else {
        throw new ServiceBreakerOpenError(
          `Circuit breaker is OPEN for ${key}. Request blocked.`,
        )
      }
    }

    try {
      const result = await operation()

      if (state.state === 'HALF_OPEN') {
        state.halfOpenSuccessCount++
        if (state.halfOpenSuccessCount >= opts.halfOpenSuccessThreshold) {
          this.transitionTo(key, state, 'CLOSED')
        }
      }

      return result
    } catch (error) {
      state.failureCount++
      state.lastFailureTime = Date.now()

      if (state.failureCount >= opts.failureThreshold) {
        this.transitionTo(key, state, 'OPEN')
      }

      throw error
    }
  }

  getState(key: string): CircuitState {
    return this.breakers.get(key)?.state ?? 'CLOSED'
  }

  reset(key: string): void {
    this.breakers.delete(key)
  }

  private getOrCreateState(key: string): BreakerState {
    let state = this.breakers.get(key)
    if (!state) {
      state = { state: 'CLOSED', failureCount: 0, halfOpenSuccessCount: 0, lastFailureTime: 0 }
      this.breakers.set(key, state)
    }
    return state
  }

  private transitionTo(key: string, state: BreakerState, newState: CircuitState): void {
    const prev = state.state
    state.state = newState
    state.failureCount = 0
    state.halfOpenSuccessCount = 0

    this.logger.warn(`Circuit breaker [${key}] transitioned: ${prev} -> ${newState}`)
    this.metrics.incrementCounter('stellar_circuit_breaker_state_changes_total', {
      key,
      from: prev,
      to: newState,
    })
  }

  private resolveOptions(overrides?: Partial<CircuitBreakerOptions>): CircuitBreakerOptions {
    return {
      failureThreshold:
        overrides?.failureThreshold ??
        parseInt(this.configService.get('CIRCUIT_BREAKER_FAILURE_THRESHOLD') ?? '', 10) ??
        DEFAULT_OPTIONS.failureThreshold,
      recoveryTimeoutMs:
        overrides?.recoveryTimeoutMs ??
        parseInt(this.configService.get('CIRCUIT_BREAKER_RECOVERY_TIMEOUT_MS') ?? '', 10) ??
        DEFAULT_OPTIONS.recoveryTimeoutMs,
      halfOpenSuccessThreshold:
        overrides?.halfOpenSuccessThreshold ??
        parseInt(this.configService.get('CIRCUIT_BREAKER_HALF_OPEN_SUCCESS_THRESHOLD') ?? '', 10) ??
        DEFAULT_OPTIONS.halfOpenSuccessThreshold,
    }
  }
}

export class ServiceBreakerOpenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ServiceBreakerOpenError'
  }
}
