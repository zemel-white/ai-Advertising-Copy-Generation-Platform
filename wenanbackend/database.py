from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker,relationship
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Float, BIGINT,BigInteger,ForeignKey
from datetime import datetime

# 数据库连接地址：mysql+pymysql://用户名:密码@主机地址:端口/数据库名
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:123456@localhost:3306/wenan"

# 创建引擎
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 创建本地会话类
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基类，用于模型继承
Base = declarative_base()


class CopywriterHistory(Base):
    __tablename__ = "copywriter_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product = Column(String(255))
    target = Column(String(255))
    style = Column(String(50))
    content = Column(Text)
    category = Column(String(50))
    created_at = Column(DateTime, default=datetime.now)

class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)        # 模板名称
    category = Column(String(100))                   # 分类
    content = Column(Text, nullable=False)            # 模板内容
    tags = Column(JSON)                              # 标签，存为 JSON 数组
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now) # 自动更新时间


class AnalyticsData(Base):
    __tablename__ = "analytics_data"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(DateTime, default=datetime.now) # 统计日期
    category = Column(String(50))                # 文案分类
    style = Column(String(50))                   # 文案风格
    usage_count = Column(Integer, default=1)      # 使用次数
    avg_rating = Column(Float, default=0.0)      # 平均评分


class KnowledgeGraph(Base):
    __tablename__ = "knowledge_graphs"

    id = Column(BIGINT, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # 建立与三元组表的关联
    triplets = relationship("Triplet", back_populates="graph", cascade="all, delete-orphan")


# 存储每一笔操作记录（审计日志）
class GraphOperation(Base):
    __tablename__ = "knowledge_graph_operations"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    operation_type = Column(String(50))  # 'add', 'edit', 'delete'
    entity_type = Column(String(50))     # 'node', 'link'
    subject = Column(String(255))
    predicate = Column(String(255))
    object = Column(String(255))
    old_values = Column(JSON)            # 变更前的数据
    new_values = Column(JSON)            # 变更后的数据
    created_at = Column(DateTime, default=datetime.now)

class Triplet(Base):
    __tablename__ = "triplets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    graph_id = Column(BIGINT, ForeignKey("knowledge_graphs.id"))
    subject = Column(String(255), index=True)
    predicate = Column(String(255))
    object = Column(String(255), index=True)
    confidence = Column(Float, default=1.0) # 预留你截图中的置信度字段
    source = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    graph = relationship("KnowledgeGraph", back_populates="triplets")

    