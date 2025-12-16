import React from 'react';
import {
    Breadcrumb as UiBreadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from './ui/breadcrumb';

type Crumb = { label: string; href?: string };

const Breadcrumb = ({ items }: { items: Crumb[] }) => {
    return (
        <UiBreadcrumb className="mb-6">
            <BreadcrumbList>
                {items.map((item, idx) => {
                    const isLast = idx === items.length - 1;
                    return (
                        <React.Fragment key={item.label + idx}>
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                                ) : item.href ? (
                                    <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                                ) : (
                                    <BreadcrumbLink>{item.label}</BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {!isLast && <BreadcrumbSeparator />}
                        </React.Fragment>
                    );
                })}
            </BreadcrumbList>
        </UiBreadcrumb>
    );
};

export default Breadcrumb;
