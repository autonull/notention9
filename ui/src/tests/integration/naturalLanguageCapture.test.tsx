import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {DescribeItComposer} from '../components/editor/DescribeItComposer';
import {ExtractionReview} from '../components/editor/ExtractionReview';
import type {OntologyNode, Property} from '@notention/core';
import {DEFAULT_ONTOLOGY} from '@notention/core';

describe('Natural Language Capture End-to-End (P1)', () => {
    const ontology = DEFAULT_ONTOLOGY;

    const mockProps: Property[] = [
        {key: 'role', operator: 'is', values: ['developer']},
        {key: 'skills', operator: 'contains', values: ['react', 'typescript']},
    ];

    describe('DescribeItComposer', () => {
        it('renders without crashing', () => {
            render(
                <DescribeItComposer
                    isOpen={true}
                    onClose={vi.fn()}
                    onApply={vi.fn()}
                    ontology={ontology}
                />
            );

            expect(screen.getByTestId('describe-it-input')).toBeInTheDocument();
            expect(screen.getByTestId('describe-it-suggest')).toBeInTheDocument();
        });

        it('shows source label', () => {
            render(
                <DescribeItComposer
                    isOpen={true}
                    onClose={vi.fn()}
                    onApply={vi.fn()}
                    ontology={ontology}
                />
            );

            expect(screen.getByTestId('describe-it-source')).toHaveTextContent('heuristic');
        });

        it('enables suggest button when text entered', () => {
            render(
                <DescribeItComposer
                    isOpen={true}
                    onClose={vi.fn()}
                    onApply={vi.fn()}
                    ontology={ontology}
                />
            );

            const suggestButton = screen.getByTestId('describe-it-suggest');
            expect(suggestButton).toBeDisabled();

            fireEvent.change(screen.getByTestId('describe-it-input'), {
                target: {value: 'I need a React developer'}
            });

            expect(suggestButton).not.toBeDisabled();
        });

        it('shows suggestions after suggest', async () => {
            render(
                <DescribeItComposer
                    isOpen={true}
                    onClose={vi.fn()}
                    onApply={vi.fn()}
                    ontology={ontology}
                />
            );

            fireEvent.change(screen.getByTestId('describe-it-input'), {
                target: {value: 'I need a React developer'}
            });

            fireEvent.click(screen.getByTestId('describe-it-suggest'));

            await waitFor(() => {
                expect(screen.getByTestId('describe-it-suggestion')).toBeInTheDocument();
            });
        });

        it('accepts and rejects suggestions', async () => {
            const onApply = vi.fn();
            
            render(
                <DescribeItComposer
                    isOpen={true}
                    onClose={vi.fn()}
                    onApply={onApply}
                    ontology={ontology}
                />
            );

            fireEvent.change(screen.getByTestId('describe-it-input'), {
                target: {value: 'I need a React developer'}
            });

            fireEvent.click(screen.getByTestId('describe-it-suggest'));

            await waitFor(() => {
                expect(screen.getByTestId('describe-it-suggestion')).toBeInTheDocument();
            });

            // Accept the suggestion
            fireEvent.click(screen.getByTestId('describe-it-accept'));

            // Apply accepted
            fireEvent.click(screen.getByTestId('describe-it-apply'));

            expect(onApply).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        key: expect.any(String),
                        operator: expect.any(String),
                        values: expect.any(Array),
                    })
                ])
            );
        });

        it('rejects suggestions', async () => {
            render(
                <DescribeItComposer
                    isOpen={true}
                    onClose={vi.fn()}
                    onApply={vi.fn()}
                    ontology={ontology}
                />
            );

            fireEvent.change(screen.getByTestId('describe-it-input'), {
                target: {value: 'I need a React developer'}
            });

            fireEvent.click(screen.getByTestId('describe-it-suggest'));

            await waitFor(() => {
                expect(screen.getByTestId('describe-it-suggestion')).toBeInTheDocument();
            });

            // Reject the suggestion
            fireEvent.click(screen.getByTestId('describe-it-reject'));

            await waitFor(() => {
                expect(screen.queryByTestId('describe-it-suggestion')).not.toBeInTheDocument();
            });
        });

        it('closes on cancel', () => {
            const onClose = vi.fn();
            
            render(
                <DescribeItComposer
                    isOpen={true}
                    onClose={onClose}
                    onApply={vi.fn()}
                    ontology={ontology}
                />
            );

            fireEvent.click(screen.getByText('Cancel'));
            expect(onClose).toHaveBeenCalled();
        });
    });

    describe('ExtractionReview', () => {
        it('renders without crashing', () => {
            const items = [
                {
                    property: {key: 'role', operator: 'is', values: ['developer']},
                    confidence: 0.85,
                    presentation: 'suggest' as const,
                },
                {
                    property: {key: 'skills', operator: 'contains', values: ['react']},
                    confidence: 0.7,
                    presentation: 'suggest' as const,
                },
            ];

            render(
                <ExtractionReview
                    items={items}
                    onAccept={vi.fn()}
                    onReject={vi.fn()}
                />
            );

            expect(screen.getByTestId('extraction-review')).toBeInTheDocument();
            expect(screen.getByText('role')).toBeInTheDocument();
            expect(screen.getByText('skills')).toBeInTheDocument();
        });

        it('shows confidence bars', () => {
            const items = [
                {
                    property: {key: 'role', operator: 'is', values: ['developer']},
                    confidence: 0.85,
                    presentation: 'suggest' as const,
                },
            ];

            render(
                <ExtractionReview
                    items={items}
                    onAccept={vi.fn()}
                    onReject={vi.fn()}
                />
            );

            expect(screen.getByText('85%')).toBeInTheDocument();
        });

        it('calls onAccept when accept clicked', () => {
            const onAccept = vi.fn();
            const items = [
                {
                    property: {key: 'role', operator: 'is', values: ['developer']},
                    confidence: 0.85,
                    presentation: 'suggest' as const,
                },
            ];

            render(
                <ExtractionReview
                    items={items}
                    onAccept={onAccept}
                    onReject={vi.fn()}
                />
            );

            fireEvent.click(screen.getByTitle('Accept role'));
            expect(onAccept).toHaveBeenCalledWith(items[0]);
        });

        it('calls onReject when reject clicked', () => {
            const onReject = vi.fn();
            const items = [
                {
                    property: {key: 'role', operator: 'is', values: ['developer']},
                    confidence: 0.85,
                    presentation: 'suggest' as const,
                },
            ];

            render(
                <ExtractionReview
                    items={items}
                    onAccept={vi.fn()}
                    onReject={onReject}
                />
            );

            fireEvent.click(screen.getByTitle('Reject role'));
            expect(onReject).toHaveBeenCalledWith(items[0]);
        });

        it('returns null when no items', () => {
            const {container} = render(
                <ExtractionReview
                    items={[]}
                    onAccept={vi.fn()}
                    onReject={vi.fn()}
                />
            );

            expect(container.firstChild).toBeNull();
        });
    });
});