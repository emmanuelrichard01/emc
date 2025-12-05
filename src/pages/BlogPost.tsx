import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, Tag, Share2, Heart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Breadcrumb from '@/components/Breadcrumb';
import { useParams } from 'react-router-dom';

const BlogPost = () => {
  const { slug } = useParams();

  // Mock blog post data - in real app, this would come from an API or CMS
  const blogPosts: Record<string, any> = {
    'building-scalable-data-pipelines': {
      id: 1,
      title: 'Building Scalable Data Pipelines with Apache Kafka and Python',
      excerpt: 'A comprehensive guide to designing and implementing robust data processing pipelines.',
      content: `
        <h2>Introduction</h2>
        <p>In today's data-driven world, building scalable and reliable data pipelines is crucial for any organization looking to leverage their data effectively. This article explores how to create robust data processing systems using Apache Kafka and Python.</p>
        
        <h2>Setting Up Apache Kafka</h2>
        <p>Apache Kafka is a distributed streaming platform that excels at handling high-throughput, fault-tolerant data streams. Let's start by setting up a basic Kafka cluster.</p>
        
        <pre><code>
# Start Kafka server
bin/kafka-server-start.sh config/server.properties

# Create a topic
bin/kafka-topics.sh --create --topic data-pipeline --bootstrap-server localhost:9092
        </code></pre>
        
        <h2>Python Integration</h2>
        <p>Using the kafka-python library, we can easily integrate Python applications with our Kafka cluster.</p>
        
        <pre><code>
from kafka import KafkaProducer, KafkaConsumer
import json

# Producer setup
producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda x: json.dumps(x).encode('utf-8')
)

# Send data
producer.send('data-pipeline', {'user_id': 123, 'action': 'login'})
        </code></pre>
        
        <h2>Best Practices</h2>
        <ul>
          <li>Use proper partitioning strategies for optimal performance</li>
          <li>Implement proper error handling and retry mechanisms</li>
          <li>Monitor your pipelines with tools like Kafka Connect</li>
          <li>Design for idempotency to handle duplicate messages</li>
        </ul>
        
        <h2>Conclusion</h2>
        <p>Building scalable data pipelines requires careful planning and the right tools. Apache Kafka, combined with Python's rich ecosystem, provides a powerful foundation for processing large volumes of data reliably.</p>
      `,
      author: 'Emmanuel C. Moghalu',
      publishDate: '2024-01-15',
      readTime: '8 min read',
      tags: ['Data Engineering', 'Apache Kafka', 'Python', 'Scalability'],
      category: 'Technical Writings',
      views: 1247,
      likes: 89
    },
    'machine-learning-production': {
      id: 2,
      title: 'Deploying Machine Learning Models to Production: A Complete Guide',
      excerpt: 'Learn how to take your ML models from development to production with confidence.',
      content: `
        <h2>The Production Challenge</h2>
        <p>Getting a machine learning model to work in a Jupyter notebook is just the beginning. The real challenge lies in deploying these models to production where they can serve real users with reliability and scale.</p>
        
        <h2>Model Versioning and Management</h2>
        <p>Before deploying any model, establishing a robust versioning system is crucial. Tools like MLflow or DVC can help track model versions, experiments, and metadata.</p>
        
        <pre><code>
import mlflow
import mlflow.sklearn

# Log model with MLflow
with mlflow.start_run():
    mlflow.log_param("alpha", 0.1)
    mlflow.log_metric("rmse", rmse)
    mlflow.sklearn.log_model(model, "model")
        </code></pre>
        
        <h2>Containerization with Docker</h2>
        <p>Containerizing your ML models ensures consistency across different environments.</p>
        
        <pre><code>
FROM python:3.9-slim

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY model.pkl .
COPY app.py .

EXPOSE 8000
CMD ["python", "app.py"]
        </code></pre>
        
        <h2>Monitoring and Observability</h2>
        <p>Production ML systems require comprehensive monitoring to detect model drift, performance degradation, and system issues.</p>
        
        <h2>A/B Testing Framework</h2>
        <p>Implementing A/B testing allows you to safely deploy new model versions and measure their impact on business metrics.</p>
        
        <h2>Conclusion</h2>
        <p>Successful ML deployment requires more than just technical knowledge—it demands a systematic approach to operations, monitoring, and continuous improvement.</p>
      `,
      author: 'Emmanuel C. Moghalu',
      publishDate: '2024-01-08',
      readTime: '12 min read',
      tags: ['Machine Learning', 'MLOps', 'Docker', 'Production'],
      category: 'Technical Writings',
      views: 2156,
      likes: 143
    },
    'microservices-architecture': {
      id: 3,
      title: 'Microservices Architecture: Lessons from Building at Scale',
      excerpt: 'Key insights and practical advice from implementing microservices in production environments.',
      content: `
        <h2>Why Microservices?</h2>
        <p>Microservices architecture has become increasingly popular for building scalable, maintainable applications. But like any architectural pattern, it comes with trade-offs.</p>
        
        <h2>Service Design Principles</h2>
        <p>Each microservice should follow the Single Responsibility Principle and be designed around business capabilities rather than technical layers.</p>
        
        <h2>Communication Patterns</h2>
        <p>Services need to communicate effectively. We'll explore synchronous (REST, GraphQL) and asynchronous (message queues, event streaming) patterns.</p>
        
        <pre><code>
# Example API Gateway configuration
services:
  user-service:
    image: user-service:latest
    ports:
      - "3001:3000"
    
  order-service:
    image: order-service:latest
    ports:
      - "3002:3000"
        </code></pre>
        
        <h2>Data Management</h2>
        <p>Each service should own its data. Avoid distributed transactions when possible and embrace eventual consistency.</p>
        
        <h2>Monitoring and Tracing</h2>
        <p>Distributed systems require sophisticated monitoring. Tools like Jaeger for tracing and Prometheus for metrics are essential.</p>
        
        <h2>Challenges and Solutions</h2>
        <ul>
          <li>Network latency and reliability</li>
          <li>Service discovery and load balancing</li>
          <li>Configuration management</li>
          <li>Testing distributed systems</li>
        </ul>
        
        <h2>When Not to Use Microservices</h2>
        <p>Microservices aren't always the answer. Start with a monolith and evolve when you have clear boundaries and team structures.</p>
      `,
      author: 'Emmanuel C. Moghalu',
      publishDate: '2023-12-22',
      readTime: '10 min read',
      tags: ['Microservices', 'Architecture', 'DevOps', 'Scalability'],
      category: 'Technical Writings',
      views: 1876,
      likes: 134
    }
  };

  const post = blogPosts[slug || ''];

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-8">The blog post you're looking for doesn't exist.</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Blog', href: '/blog' },
    { label: post.title }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Button>
        </motion.div>

        <article>
          {/* Article Header */}
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="mb-6">
              <Badge variant="secondary" className="mb-4">
                {post.category}
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                {post.title}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {post.excerpt}
              </p>
            </div>

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground border-b border-border pb-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(post.publishDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {post.readTime}
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {post.views.toLocaleString()} views
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                {post.likes} likes
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-6">
              {post.tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          </motion.header>

          {/* Article Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Article Footer */}
          <motion.footer
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12 pt-8 border-t border-border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Written by</p>
                <p className="font-semibold">{post.author}</p>
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Share Article
              </Button>
            </div>
          </motion.footer>
        </article>
      </div>
    </div>
  );
};

export default BlogPost;